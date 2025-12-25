#!/usr/bin/env python3
import sys
import urllib.parse
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
TIMEOUT = 6

class ProxyHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/health':
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
            return
        if parsed.path == '/proxy':
            qs = urllib.parse.parse_qs(parsed.query)
            url = qs.get('url', [''])[0]
            if not url:
                self.send_response(400)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error":"missing url"}')
                return
            try:
                resp = requests.get(url, headers={'User-Agent': USER_AGENT}, timeout=TIMEOUT)
                content_type = resp.headers.get('Content-Type', 'application/octet-stream')
                self.send_response(resp.status_code)
                self._send_cors_headers()
                self.send_header('Content-Type', content_type)
                self.end_headers()
                self.wfile.write(resp.content)
            except Exception as e:
                self.send_response(502)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                msg = ('{"error":"upstream fetch failed","detail":' +
                       '"' + str(e).replace('"','') + '"}')
                self.wfile.write(msg.encode('utf-8'))
            return
        # Simple helpers mapped to Yahoo endpoints
        if parsed.path.startswith('/yahoo/quote'):
            qs = urllib.parse.parse_qs(parsed.query)
            symbols = qs.get('symbols', [''])[0]
            url = f'https://query1.finance.yahoo.com/v7/finance/quote?symbols={urllib.parse.quote(symbols)}'
            self._forward(url)
            return
        if parsed.path.startswith('/yahoo/summary'):
            qs = urllib.parse.parse_qs(parsed.query)
            symbol = qs.get('symbol', [''])[0]
            url = f'https://query2.finance.yahoo.com/v10/finance/quoteSummary/{urllib.parse.quote(symbol)}?modules=price'
            self._forward(url)
            return
        if parsed.path.startswith('/yahoo/chart'):
            qs = urllib.parse.parse_qs(parsed.query)
            symbol = qs.get('symbol', [''])[0]
            url = f'https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}'
            self._forward(url)
            return
        # 404
        self.send_response(404)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"error":"not found"}')

    def _forward(self, url: str):
        try:
            resp = requests.get(url, headers={'User-Agent': USER_AGENT}, timeout=TIMEOUT)
            content_type = resp.headers.get('Content-Type', 'application/json')
            self.send_response(resp.status_code)
            self._send_cors_headers()
            self.send_header('Content-Type', content_type)
            self.end_headers()
            self.wfile.write(resp.content)
        except Exception as e:
            self.send_response(502)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            msg = ('{"error":"upstream fetch failed","detail":' +
                   '"' + str(e).replace('"','') + '"}')
            self.wfile.write(msg.encode('utf-8'))

if __name__ == '__main__':
    # Bind to IPv4 localhost to avoid IPv6/localhost resolution issues
    httpd = HTTPServer(('127.0.0.1', PORT), ProxyHandler)
    print(f'Local proxy running on http://127.0.0.1:{PORT}')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
