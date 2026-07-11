import http from 'k6/http';
import { check } from 'k6';

export const options = { vus: 50, duration: '30s' };

export default function () {
  const res = http.get('http://host.docker.internal:3000/3s', { redirects: 0 });
  check(res, { 'is redirect': (r) => r.status === 301 || r.status === 302 });
}