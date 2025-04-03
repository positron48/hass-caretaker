"""Proxy server for ESP32 Robot interface."""
import logging
import aiohttp
from aiohttp import web
import asyncio
from urllib.parse import urljoin, urlparse
import re
import voluptuous as vol

from homeassistant.components.http import HomeAssistantView, KEY_AUTHENTICATED
from homeassistant.core import HomeAssistant
from homeassistant.components.http.auth import _async_validate_api_token

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

    # Отключаем стандартную авторизацию Home Assistant, так как используем свою
    requires_auth = False
    cors_allowed = True  # Разрешаем CORS для работы через внешние приложения
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
        
    async def _check_authentication(self, request):
        token = request.query.get("token")
        if not token:
            return False

        try:
            user = await _async_validate_api_token(self.hass, token)
            if user:
                _LOGGER.debug(f"User authenticated via token: {user.name}")
                request["hass_user"] = user  # можно передать дальше, если нужно
                request["auth_token"] = token
                return True
        except Exception as e:
            _LOGGER.warning(f"Token validation failed: {e}")

        return False
        
    async def _proxy_request(self, request, robot_id, path, method):
        """Proxy a request to the robot."""
        # Проверяем аутентификацию пользователя
        is_authenticated = await self._check_authentication(request)
        if not is_authenticated:
            return web.Response(status=401, text="Unauthorized. Please provide a valid token.")
            
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
        
        # Для потоковых запросов убираем таймаут совсем
        if 'stream' in path:
            timeout = None  # Без ограничения по времени
        else:
            timeout = 10  # Стандартный таймаут для обычных запросов
        
        # Логгируем запрос для отладки
        _LOGGER.debug(f"Proxying {method} request to {target_url}")
        
        try:
            # Получаем тело запроса, если оно есть
            data = await request.read() if request.content_length else None
            
            # Получаем параметры запроса и удаляем токен из запроса к роботу
            params = dict(request.query)
            # Удаляем токен из запроса к роботу для безопасности
            if 'token' in params:
                del params['token']
            
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
                    timeout=timeout
                ) as resp:
                    # Копируем заголовки ответа
                    resp_headers = {k: v for k, v in resp.headers.items()
                                   if k.lower() not in ('transfer-encoding',)}
                    
                    # Проверяем тип контента
                    content_type = resp.headers.get('Content-Type', '').lower()
                    
                    # Проверяем, сжат ли контент
                    content_encoding = resp.headers.get('Content-Encoding', '').lower()
                    is_gzipped = 'gzip' in content_encoding
                    
                    # Всегда удаляем заголовок Content-Encoding, т.к. мы будем отдавать 
                    # несжатый контент и предотвращаем ошибку ERR_CONTENT_DECODING_FAILED
                    resp_headers.pop('Content-Encoding', None)
                    
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
                    
                    # Определяем, является ли это потоковым запросом
                    is_stream_request = (
                        'stream' in path or 
                        'multipart/x-mixed-replace' in content_type or
                        'text/event-stream' in content_type or
                        'video/' in content_type or
                        resp.headers.get('Transfer-Encoding', '') == 'chunked'
                    )
                    
                    # Для потоковых данных используем StreamResponse
                    if is_stream_request:
                        try:
                            # Устанавливаем правильные заголовки
                            if 'Content-Type' in resp_headers:
                                content_type = resp_headers['Content-Type']
                            else:
                                content_type = 'application/octet-stream'
                                
                            # Создаем потоковый ответ
                            resp_obj = web.StreamResponse(
                                status=resp.status,
                                headers=resp_headers,
                            )
                            
                            # Подготавливаем ответ
                            await resp_obj.prepare(request)
                            
                            # Передаем данные чанками с обработкой исключений
                            try:
                                buffer_size = 4096  # Оптимальный размер буфера
                                async for data in resp.content.iter_chunked(buffer_size):
                                    await resp_obj.write(data)
                                    # Небольшая пауза для предотвращения переполнения буфера
                                    await asyncio.sleep(0.001)
                            except (asyncio.CancelledError, aiohttp.ClientPayloadError) as e:
                                _LOGGER.debug(f"Stream interrupted: {e}")
                            except Exception as e:
                                _LOGGER.error(f"Error during streaming: {e}")
                            finally:
                                # Всегда закрываем поток корректно
                                await resp_obj.write_eof()
                            return resp_obj
                        except Exception as stream_err:
                            _LOGGER.error(f"Stream setup error: {stream_err}")
                            return web.Response(status=500, text=f"Stream error: {stream_err}")
                    
                    # Определяем, нужно ли модифицировать контент
                    is_html_content = 'text/html' in content_type
                    is_api_content = any(api_type in content_type for api_type in 
                                        ['application/json', 'text/json', 'application/xml', 
                                         'text/xml', 'application/javascript'])
                    is_binary_content = any(bin_type in content_type for bin_type in BINARY_CONTENT_TYPES)
                    
                    # Читаем ответ
                    if resp.status == 200 and is_html_content:
                        # Только для HTML контента модифицируем ссылки
                        try:
                            # Полностью читаем весь контент перед модификацией с увеличенным размером буфера
                            chunk_size = 1024 * 1024  # 1 MB
                            content_parts = []
                            async for chunk in resp.content.iter_chunked(chunk_size):
                                content_parts.append(chunk)
                            content = b''.join(content_parts)
                            
                            # Получаем фактические размеры для логирования
                            actual_size = len(content)
                            _LOGGER.debug(f"Received HTML content, size: {actual_size} bytes")
                            
                            # Обнаружение кодировки из meta тегов или заголовков
                            charset = None
                            content_type_header = resp.headers.get('Content-Type', '')
                            
                            # Ищем charset в заголовках
                            if 'charset=' in content_type_header:
                                charset = content_type_header.split('charset=')[1].strip()
                                
                            # Пробуем декодировать как текст с определенной кодировкой
                            try:
                                if charset:
                                    text_content = content.decode(charset)
                                else:
                                    # Сначала попробуем UTF-8
                                    text_content = content.decode('utf-8')
                            except UnicodeDecodeError:
                                try:
                                    # Потом латинский
                                    text_content = content.decode('latin-1')
                                except UnicodeDecodeError:
                                    # С заменой невалидных символов
                                    text_content = content.decode('utf-8', errors='replace')
                            
                            # Модифицируем контент
                            modified_content = self._rewrite_content(text_content, robot_id, robot_url)
                            
                            # Проверяем, что контент был успешно модифицирован
                            if len(modified_content) < len(text_content) * 0.9:
                                _LOGGER.warning(f"Modified content is significantly smaller than original ({len(modified_content)} vs {len(text_content)}), using original")
                                modified_content = text_content
                                
                                # Просто добавляем наш JavaScript, без замены URL
                                if '</body>' in modified_content:
                                    # Базовый URL прокси для этого робота
                                    proxy_base = f"{PROXY_BASE_PATH}/{robot_id}"
                                    intercept_js = self._get_intercept_js(proxy_base, robot_id, ip_address)
                                    modified_content = modified_content.replace('</body>', intercept_js + '</body>')
                            
                            # Убираем Content-Length если он есть, так как наш контент модифицирован
                            resp_headers.pop('Content-Length', None)
                            
                            return web.Response(
                                status=resp.status,
                                headers=resp_headers,
                                text=modified_content
                            )
                        except Exception as e:
                            # В случае любой ошибки, возвращаем контент как есть
                            _LOGGER.error(f"Error processing HTML content: {e}")
                            try:
                                return web.Response(
                                    status=resp.status,
                                    headers=resp_headers,
                                    body=content
                                )
                            except:
                                # Если даже это не сработало, попробуем без модификаций просто перенаправить
                                _LOGGER.error(f"Critical error forwarding response, trying StreamResponse")
                                try:
                                    # Сбрасываем соединение и повторно читаем контент
                                    resp_obj = web.StreamResponse(
                                        status=resp.status,
                                        headers=resp_headers,
                                    )
                                    await resp_obj.prepare(request)
                                    
                                    # Просто передаем данные без модификации
                                    await resp_obj.write(content)
                                    await resp_obj.write_eof()
                                    return resp_obj
                                except Exception as final_e:
                                    _LOGGER.error(f"Final error forwarding: {final_e}")
                                    return web.Response(status=500, text="Error processing response")
                    elif resp.status == 200 and is_api_content:
                        # API контент (JSON, XML) возвращаем без модификаций
                        try:
                            # Полностью читаем весь контент
                            chunk_size = 1024 * 1024  # 1 MB
                            content_parts = []
                            async for chunk in resp.content.iter_chunked(chunk_size):
                                content_parts.append(chunk)
                            content = b''.join(content_parts)
                            
                            # Получаем фактические размеры для логирования
                            actual_size = len(content)
                            _LOGGER.debug(f"Received API content, size: {actual_size} bytes")
                            
                            # Обнаружение кодировки из заголовков
                            charset = None
                            content_type_header = resp.headers.get('Content-Type', '')
                            
                            # Ищем charset в заголовках
                            if 'charset=' in content_type_header:
                                charset = content_type_header.split('charset=')[1].strip()
                            
                            # Пробуем декодировать как текст
                            try:
                                if charset:
                                    text_content = content.decode(charset)
                                else:
                                    # Сначала пробуем UTF-8
                                    text_content = content.decode('utf-8')
                            except UnicodeDecodeError:
                                # Для API контента лучше не использовать replacement,
                                # так как это может привести к невалидному JSON или XML
                                _LOGGER.warning("Unicode decode error for API content, returning as binary")
                                return web.Response(
                                    status=resp.status,
                                    headers=resp_headers,
                                    body=content
                                )
                            
                            # Убираем Content-Length, так как его устанавливает Response автоматически
                            resp_headers.pop('Content-Length', None)
                            
                            return web.Response(
                                status=resp.status,
                                headers=resp_headers,
                                text=text_content
                            )
                        except Exception as e:
                            # В случае любой ошибки, возвращаем контент как есть
                            _LOGGER.error(f"Error processing API content: {e}")
                            try:
                                return web.Response(
                                    status=resp.status,
                                    headers=resp_headers,
                                    body=content
                                )
                            except:
                                # Если даже это не сработало, попробуем без модификаций просто перенаправить
                                _LOGGER.error(f"Critical error forwarding API response, trying StreamResponse")
                                try:
                                    # Создаем поток для передачи данных
                                    resp_obj = web.StreamResponse(
                                        status=resp.status,
                                        headers=resp_headers,
                                    )
                                    await resp_obj.prepare(request)
                                    
                                    # Просто передаем данные без модификации
                                    await resp_obj.write(content)
                                    await resp_obj.write_eof()
                                    return resp_obj
                                except Exception as final_e:
                                    _LOGGER.error(f"Final error forwarding API: {final_e}")
                                    return web.Response(status=500, text="Error processing API response")
                    else:
                        # Бинарный или неизвестный контент возвращаем как есть
                        try:
                            # Читаем данные по частям
                            chunk_size = 1024 * 1024  # 1 MB
                            content_parts = []
                            async for chunk in resp.content.iter_chunked(chunk_size):
                                content_parts.append(chunk)
                            content = b''.join(content_parts)
                            
                            # Убираем Content-Length, так как его устанавливает Response автоматически
                            resp_headers.pop('Content-Length', None)
                            
                            return web.Response(
                                status=resp.status,
                                headers=resp_headers,
                                body=content
                            )
                        except Exception as e:
                            _LOGGER.error(f"Error processing binary content: {e}")
                            try:
                                # Создаем поток для передачи данных
                                resp_obj = web.StreamResponse(
                                    status=resp.status,
                                    headers=resp_headers,
                                )
                                await resp_obj.prepare(request)
                                
                                # Передаем данные
                                await resp_obj.write(content)
                                await resp_obj.write_eof()
                                return resp_obj
                            except Exception as final_e:
                                _LOGGER.error(f"Final error forwarding binary: {final_e}")
                                return web.Response(status=500, text="Error processing binary response")
                        
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
        ip_address = self.robots[robot_id]
        
        # Функция для проверки, не содержит ли URL уже прокси-путь
        def is_already_proxied(url):
            return proxy_base in url
        
        # Заменяем абсолютные ссылки на ресурсы
        content = re.sub(
            r'(src|href|action)=["\'](?:http://|https://)?(?:' + re.escape(robot_url.replace('http://', '')) + r')(/[^"\']*)["\']',
            lambda m: f'{m.group(1)}="{proxy_base}{m.group(2)}"' if not is_already_proxied(m.group(0)) else m.group(0),
            content
        )
        
        # Заменяем IP-адрес внутри текста
        content = re.sub(
            r'(["\'])(?:http://|https://)?(?:' + re.escape(ip_address) + r')(/[^"\']*)["\']',
            lambda m: f'{m.group(1)}{proxy_base}{m.group(2)}{m.group(1)}' if not is_already_proxied(m.group(0)) else m.group(0),
            content
        )
        
        # Заменяем ссылки, начинающиеся с /
        content = re.sub(
            r'(src|href|action)=["\'](/[^"\']*)["\']',
            lambda m: f'{m.group(1)}="{proxy_base}{m.group(2)}"' if not is_already_proxied(m.group(0)) and not m.group(2).startswith(f"{PROXY_BASE_PATH}/{robot_id}") else m.group(0),
            content
        )
        
        # Заменяем fetch и XMLHttpRequest URL в JavaScript
        content = re.sub(
            r'(fetch\(["\'])(/[^"\']+)(["\'])',
            lambda m: f'{m.group(1)}{proxy_base}{m.group(2)}{m.group(3)}' if not m.group(2).startswith(proxy_base) else m.group(0),
            content
        )
        
        content = re.sub(
            r'(\.open\([^,]+,["\'])(/[^"\']+)(["\'])',
            lambda m: f'{m.group(1)}{proxy_base}{m.group(2)}{m.group(3)}' if not m.group(2).startswith(proxy_base) else m.group(0),
            content
        )
        
        # Заменяем WebSocket URL
        content = re.sub(
            r'(new WebSocket\(["\'])(?:ws://|wss://)?(?:' + re.escape(ip_address) + r')(/[^"\']*)["\']',
            lambda m: f'{m.group(1)}wss://" + window.location.host + "{proxy_base}{m.group(2)}"' if not is_already_proxied(m.group(0)) else m.group(0),
            content
        )
        
        # Заменяем ссылки в CSS
        content = re.sub(
            r'url\(["\']?(?:http://|https://)?(?:' + re.escape(robot_url.replace('http://', '')) + r')?(/[^"\'\)]*)["\']?\)',
            lambda m: f'url("{proxy_base}{m.group(1)}")' if not is_already_proxied(m.group(0)) else m.group(0),
            content
        )
        
        # Заменяем любые оставшиеся прямые ссылки к API эндпоинтам
        content = re.sub(
            r'(["\'])(/((?:api|bt|stream|control|status)[^"\']*))["\']{1}',
            lambda m: f'{m.group(1)}{proxy_base}{m.group(2)}{m.group(1)}' if not m.group(2).startswith(proxy_base) and not is_already_proxied(m.group(0)) else m.group(0),
            content
        )
        
        # Добавляем JavaScript для перехвата динамически созданных запросов
        intercept_js = self._get_intercept_js(proxy_base, robot_id, ip_address)
        
        # Добавляем наш JavaScript перед закрывающим тегом </body>
        if '</body>' in content:
            content = content.replace('</body>', intercept_js + '</body>')
        else:
            content += intercept_js
            
        return content

    def _get_intercept_js(self, proxy_base, robot_id, ip_address):
        """Generate JavaScript code for URL interception."""
        return f"""
        <script>
        (function() {{
            console.log("ESP32 Robot proxy initializing...");
            
            // Проверяем, не запущен ли уже наш скрипт
            if (window.ESP32_ROBOT_PROXY_INITIALIZED) return;
            window.ESP32_ROBOT_PROXY_INITIALIZED = true;
            
            // Базовый URL для прокси
            const proxyBase = '{proxy_base}';
            console.log("Using proxy base: " + proxyBase);
            
            // Функция для преобразования URL
            function rewriteUrl(url) {{
                if (typeof url !== 'string') return url;
                
                // Предотвращаем дублирование прокси-пути
                if (url.includes(proxyBase)) {{
                    return url;
                }}
                
                // Если это уже начинается с нашего прокси-пути
                if (url.startsWith('{PROXY_BASE_PATH}')) {{
                    return url;
                }}
                
                // Если это абсолютный URL с IP-адресом робота
                if (url.match(/^https?:\\/\\/{re.escape(ip_address)}/)) {{
                    return url.replace(/^https?:\\/\\/{re.escape(ip_address)}/, proxyBase);
                }}
                
                // Если это относительный URL, начинающийся с /
                if (url.startsWith('/')) {{
                    // Проверяем, не начинается ли URL уже с прокси-пути
                    if (!url.startsWith(proxyBase) && !url.startsWith('{PROXY_BASE_PATH}')) {{
                        return proxyBase + url;
                    }}
                }}
                
                return url;
            }}
            
            // Хак для перехвата динамически созданных запросов
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {{
                url = rewriteUrl(url);
                console.log("Proxying fetch to:", url);
                return originalFetch(url, options);
            }};
            
            // Перехват XMLHttpRequest
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...args) {{
                url = rewriteUrl(url);
                console.log("Proxying XHR to:", url);
                return originalOpen.call(this, method, url, ...args);
            }};
            
            // Перехват WebSocket
            if (window.WebSocket) {{
                const originalWebSocket = window.WebSocket;
                window.WebSocket = function(url, protocols) {{
                    if (typeof url === 'string') {{
                        if (url.startsWith('ws://')) {{
                            // Заменяем ws:// на wss:// и домен на текущий
                            const path = url.replace(/^ws:\\/\\/[^/]+/, '');
                            
                            // Проверяем, не начинается ли путь уже с прокси-пути
                            if (!path.startsWith(proxyBase) && !path.startsWith('{PROXY_BASE_PATH}')) {{
                                url = 'wss://' + window.location.host + proxyBase + path;
                            }} else {{
                                url = 'wss://' + window.location.host + path;
                            }}
                            
                            console.log("Proxying WebSocket to:", url);
                        }}
                    }}
                    return new originalWebSocket(url, protocols);
                }};
                window.WebSocket.prototype = originalWebSocket.prototype;
                window.WebSocket.CONNECTING = originalWebSocket.CONNECTING;
                window.WebSocket.OPEN = originalWebSocket.OPEN;
                window.WebSocket.CLOSING = originalWebSocket.CLOSING;
                window.WebSocket.CLOSED = originalWebSocket.CLOSED;
            }}
            
            // Перехват EventSource для Server-Sent Events
            if (window.EventSource) {{
                const originalEventSource = window.EventSource;
                window.EventSource = function(url, options) {{
                    url = rewriteUrl(url);
                    console.log("Proxying EventSource to:", url);
                    return new originalEventSource(url, options);
                }};
                window.EventSource.prototype = originalEventSource.prototype;
            }}
            
            // Добавляем обработчики для AJAX-запросов jQuery, если jQuery доступен
            if (window.jQuery) {{
                jQuery(document).ajaxSend(function(event, jqxhr, settings) {{
                    if (typeof settings.url === 'string') {{
                        settings.url = rewriteUrl(settings.url);
                        console.log("Proxying jQuery AJAX to:", settings.url);
                    }}
                }});
            }}
            
            // Исправляем все ссылки в документе
            document.querySelectorAll('a[href], [src], form[action]').forEach(el => {{
                if (el.tagName === 'A' && el.hasAttribute('href')) {{
                    el.href = rewriteUrl(el.getAttribute('href'));
                }} else if (el.hasAttribute('src')) {{
                    el.src = rewriteUrl(el.getAttribute('src'));
                }} else if (el.tagName === 'FORM' && el.hasAttribute('action')) {{
                    el.action = rewriteUrl(el.getAttribute('action'));
                }}
            }});
            
            console.log("ESP32 Robot proxy initialized successfully");
        }})();
        </script>
        """

async def async_setup_proxy(hass: HomeAssistant):
    """Set up the proxy server for ESP32 Robot."""
    proxy_view = ESP32RobotProxyView(hass)
    hass.http.register_view(proxy_view)
    
    return proxy_view 