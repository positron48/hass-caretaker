"""Proxy server for ESP32 Robot interface."""
import logging
import aiohttp
from aiohttp import web
import asyncio
from urllib.parse import urljoin
import re

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

PROXY_BASE_PATH = "/api/esp32_robot_proxy"
BINARY_CONTENT_TYPES = [
    'application/octet-stream',
    'application/javascript',
    'application/wasm',
    'image/',
    'video/',
    'audio/',
    'font/',
    'application/font',
]

class ESP32RobotProxyView(HomeAssistantView):
    """View to proxy requests to ESP32 Robot."""

    requires_auth = True
    url = PROXY_BASE_PATH + "/{robot_id}/{path:.*}"
    name = "api:esp32_robot_proxy"
    
    def __init__(self, hass):
        """Initialize the proxy view."""
        self.hass = hass
        self.robots = {}  # Map of robot_id -> ip_address
        
    def register_robot(self, robot_id, ip_address):
        """Register a robot for proxying."""
        self.robots[robot_id] = ip_address
        return f"{PROXY_BASE_PATH}/{robot_id}/"
        
    async def get(self, request, robot_id, path):
        """Handle GET requests."""
        return await self._proxy_request(request, robot_id, path, 'GET')
        
    async def post(self, request, robot_id, path):
        """Handle POST requests."""
        return await self._proxy_request(request, robot_id, path, 'POST')
        
    async def put(self, request, robot_id, path):
        """Handle PUT requests."""
        return await self._proxy_request(request, robot_id, path, 'PUT')
        
    async def delete(self, request, robot_id, path):
        """Handle DELETE requests."""
        return await self._proxy_request(request, robot_id, path, 'DELETE')
    
    async def _proxy_request(self, request, robot_id, path, method):
        """Proxy a request to the robot."""
        if robot_id not in self.robots:
            return web.Response(status=404, text=f"Robot {robot_id} not found")
            
        ip_address = self.robots[robot_id]
        robot_url = f"http://{ip_address}"
        
        # Конструируем URL для запроса к роботу
        target_url = urljoin(robot_url, path)
        
        try:
            # Получаем тело запроса, если оно есть
            data = await request.read() if request.content_length else None
            
            # Копируем заголовки запроса
            headers = {k: v for k, v in request.headers.items() 
                      if k.lower() not in ('host', 'authorization')}
            
            # Создаем сессию и выполняем запрос
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method, 
                    target_url,
                    headers=headers,
                    data=data,
                    allow_redirects=False,
                    timeout=10
                ) as resp:
                    # Копируем заголовки ответа
                    resp_headers = {k: v for k, v in resp.headers.items()
                                   if k.lower() not in ('transfer-encoding',)}
                    
                    # Проверяем, нужно ли модифицировать контент с ссылками
                    is_text_content = True
                    content_type = resp.headers.get('Content-Type', '')
                    
                    for bin_type in BINARY_CONTENT_TYPES:
                        if bin_type in content_type:
                            is_text_content = False
                            break
                    
                    # Читаем ответ
                    if resp.status == 200 and is_text_content:
                        content = await resp.text()
                        
                        # Заменяем ссылки, чтобы они проходили через прокси
                        content = self._rewrite_content(content, robot_id, robot_url)
                        
                        return web.Response(
                            status=resp.status,
                            headers=resp_headers,
                            text=content
                        )
                    else:
                        content = await resp.read()
                        return web.Response(
                            status=resp.status,
                            headers=resp_headers,
                            body=content
                        )
                        
        except aiohttp.ClientError as err:
            _LOGGER.error(f"Error proxying request to {target_url}: {err}")
            return web.Response(status=502, text=f"Error proxying request: {err}")
        except asyncio.TimeoutError:
            _LOGGER.error(f"Timeout while proxying request to {target_url}")
            return web.Response(status=504, text="Request timed out")
        except Exception as err:
            _LOGGER.error(f"Unexpected error: {err}")
            return web.Response(status=500, text=f"Unexpected error: {err}")
            
    def _rewrite_content(self, content, robot_id, robot_url):
        """Rewrite URLs in content to use the proxy."""
        # Базовый URL прокси для этого робота
        proxy_base = f"{PROXY_BASE_PATH}/{robot_id}"
        
        # Заменяем абсолютные ссылки на ресурсы
        content = re.sub(
            r'(src|href)=["\'](?:http://|https://)?(?:' + re.escape(robot_url.replace('http://', '')) + r')(/[^"\']*)["\']',
            r'\1="' + proxy_base + r'\2"',
            content
        )
        
        # Заменяем ссылки, начинающиеся с /
        content = re.sub(
            r'(src|href)=["\'](/[^"\']*)["\']',
            r'\1="' + proxy_base + r'\1"',
            content
        )
        
        # Заменяем ссылки в CSS
        content = re.sub(
            r'url\(["\']?(?:http://|https://)?(?:' + re.escape(robot_url.replace('http://', '')) + r')?(/[^"\'\)]*)["\']?\)',
            r'url("' + proxy_base + r'\1")',
            content
        )
        
        # Заменяем ссылки для API и WebSockets
        content = re.sub(
            r'["\'](?:http://|https://)?(?:' + re.escape(robot_url.replace('http://', '')) + r')(/[^"\']*)["\']',
            r'"' + proxy_base + r'\1"',
            content
        )
        
        return content

async def async_setup_proxy(hass: HomeAssistant):
    """Set up the proxy server for ESP32 Robot."""
    proxy_view = ESP32RobotProxyView(hass)
    hass.http.register_view(proxy_view)
    return proxy_view 