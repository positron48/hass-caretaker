"""Proxy server for ESP32 Robot interface."""
import logging
import aiohttp
from aiohttp import web
import asyncio
from urllib.parse import urljoin, urlparse
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

    # Для работы внутри Home Assistant через iframe требуется аутентификация
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
        
        # Если path пустой, заменяем на "/"
        if not path:
            path = "/"
            
        # Если path не начинается с "/", добавляем его
        if not path.startswith("/"):
            path = "/" + path
            
        # Конструируем URL для запроса к роботу
        target_url = urljoin(robot_url, path)
        
        # Логгируем запрос для отладки
        _LOGGER.debug(f"Proxying {method} request to {target_url}")
        
        try:
            # Получаем тело запроса, если оно есть
            data = await request.read() if request.content_length else None
            
            # Получаем параметры запроса
            params = request.query
            
            # Копируем заголовки запроса
            headers = {k: v for k, v in request.headers.items() 
                      if k.lower() not in ('host', 'authorization')}
            
            # Создаем сессию и выполняем запрос
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method, 
                    target_url,
                    params=params,
                    headers=headers,
                    data=data,
                    allow_redirects=False,
                    timeout=30  # Увеличиваем таймаут для видеопотока
                ) as resp:
                    # Копируем заголовки ответа
                    resp_headers = {k: v for k, v in resp.headers.items()
                                   if k.lower() not in ('transfer-encoding',)}
                    
                    # Если это редирект, перенаправляем через прокси
                    if resp.status in (301, 302, 303, 307, 308) and 'Location' in resp_headers:
                        original_location = resp_headers['Location']
                        
                        # Преобразуем URL, если это относительный URL или URL того же хоста
                        parsed_url = urlparse(original_location)
                        if not parsed_url.netloc or parsed_url.netloc == ip_address:
                            # Берем только path и query
                            path_with_query = parsed_url.path
                            if parsed_url.query:
                                path_with_query += f"?{parsed_url.query}"
                                
                            # Обновляем Location в заголовках
                            resp_headers['Location'] = f"{PROXY_BASE_PATH}/{robot_id}{path_with_query}"
                    
                    # Проверяем, нужно ли модифицировать контент с ссылками
                    is_text_content = True
                    content_type = resp.headers.get('Content-Type', '')
                    
                    for bin_type in BINARY_CONTENT_TYPES:
                        if bin_type in content_type:
                            is_text_content = False
                            break
                    
                    # Для потокового видео, просто проксируем данные
                    if 'multipart/x-mixed-replace' in content_type:
                        return web.StreamResponse(
                            status=resp.status,
                            headers=resp_headers,
                        )
                    
                    # Читаем ответ
                    if resp.status == 200 and is_text_content:
                        content = await resp.text()
                        
                        # Заменяем ссылки, чтобы они проходили через прокси
                        content = self._rewrite_content(content, robot_id, robot_url, ip_address)
                        
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
            
    def _rewrite_content(self, content, robot_id, robot_url, ip_address):
        """Rewrite URLs in content to use the proxy."""
        # Базовый URL прокси для этого робота
        proxy_base = f"{PROXY_BASE_PATH}/{robot_id}"
        
        # Заменяем абсолютные ссылки на ресурсы
        content = re.sub(
            r'(src|href|action)=["\'](?:http://|https://)?(?:' + re.escape(robot_url.replace('http://', '')) + r')(/[^"\']*)["\']',
            r'\1="' + proxy_base + r'\2"',
            content
        )
        
        # Заменяем IP-адрес внутри текста
        content = re.sub(
            r'(["\'])(?:http://|https://)?(?:' + re.escape(ip_address) + r')(/[^"\']*)["\']',
            r'\1' + proxy_base + r'\2\1',
            content
        )
        
        # Заменяем ссылки, начинающиеся с /
        content = re.sub(
            r'(src|href|action)=["\'](/[^"\']*)["\']',
            r'\1="' + proxy_base + r'\2"',
            content
        )
        
        # Заменяем fetch и XMLHttpRequest URL в JavaScript
        content = re.sub(
            r'(fetch\(["\'])(/[^"\']+)(["\'])',
            r'\1' + proxy_base + r'\2\3',
            content
        )
        
        content = re.sub(
            r'(\.open\([^,]+,["\'])(/[^"\']+)(["\'])',
            r'\1' + proxy_base + r'\2\3',
            content
        )
        
        # Заменяем WebSocket URL
        content = re.sub(
            r'(new WebSocket\(["\'])(?:ws://|wss://)?(?:' + re.escape(ip_address) + r')(/[^"\']*)["\']',
            r'\1wss://" + window.location.host + "' + proxy_base + r'\2"',
            content
        )
        
        # Заменяем ссылки в CSS
        content = re.sub(
            r'url\(["\']?(?:http://|https://)?(?:' + re.escape(robot_url.replace('http://', '')) + r')?(/[^"\'\)]*)["\']?\)',
            r'url("' + proxy_base + r'\1")',
            content
        )
        
        # Заменяем любые оставшиеся прямые ссылки к API эндпоинтам
        content = re.sub(
            r'(["\'])(?:/(?:api|bt|stream|control|status)[^"\']*)["\']',
            r'\1' + proxy_base + r'\2\1',
            content
        )
        
        # Добавляем JavaScript для перехвата динамически созданных запросов
        intercept_js = f"""
        <script>
        (function() {{
            // Хак для перехвата динамически созданных запросов
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {{
                if (typeof url === 'string' && url.startsWith('/')) {{
                    url = '{proxy_base}' + url;
                }}
                return originalFetch(url, options);
            }};
            
            // Перехват XMLHttpRequest
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...args) {{
                if (typeof url === 'string' && url.startsWith('/')) {{
                    url = '{proxy_base}' + url;
                }}
                return originalOpen.call(this, method, url, ...args);
            }};
            
            // Перехват WebSocket
            const originalWebSocket = window.WebSocket;
            window.WebSocket = function(url, protocols) {{
                if (typeof url === 'string' && url.startsWith('ws://')) {{
                    // Заменяем ws:// на wss:// и домен на текущий
                    const path = url.replace(/^ws:\/\/[^/]+/, '');
                    url = 'wss://' + window.location.host + '{proxy_base}' + path;
                }}
                return new originalWebSocket(url, protocols);
            }};
        }})();
        </script>
        """
        
        # Добавляем наш JavaScript перед закрывающим тегом </body>
        if '</body>' in content:
            content = content.replace('</body>', intercept_js + '</body>')
        else:
            content += intercept_js
            
        return content

async def async_setup_proxy(hass: HomeAssistant):
    """Set up the proxy server for ESP32 Robot."""
    proxy_view = ESP32RobotProxyView(hass)
    hass.http.register_view(proxy_view)
    return proxy_view 