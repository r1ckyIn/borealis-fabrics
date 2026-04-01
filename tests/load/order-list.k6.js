/**
 * k6 load test: Order list with filtering.
 * Tests paginated order list and filtered queries under concurrent load.
 *
 * Usage:
 *   k6 run tests/load/order-list.k6.js
 *   k6 run -e BASE_URL=http://staging.example.com/api/v1 tests/load/order-list.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export const options = {
  stages: [
    { duration: '30s', target: 5 },  // ramp up to 5 VUs
    { duration: '1m', target: 5 },   // hold at 5 VUs
    { duration: '10s', target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95th percentile under 1000ms (orders are heavier)
  },
};

/**
 * Authenticate and return a session for subsequent requests.
 */
function login() {
  const payload = JSON.stringify({ userId: 1 });
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };
  const res = http.post(`${BASE_URL}/auth/dev-login`, payload, params);
  check(res, { 'login status 200': (r) => r.status === 200 });
}

export default function () {
  // Authenticate first
  login();

  // GET order list (paginated)
  const listRes = http.get(`${BASE_URL}/orders?page=1&pageSize=20`);
  check(listRes, {
    'list status is 200': (r) => r.status === 200,
    'list has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch {
        return false;
      }
    },
  });

  // GET filtered order list (by status)
  const filteredRes = http.get(`${BASE_URL}/orders?page=1&pageSize=20&status=PENDING`);
  check(filteredRes, {
    'filtered status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
