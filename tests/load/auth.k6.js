/**
 * k6 load test: Authentication flow.
 * Tests the dev-login endpoint under concurrent load.
 *
 * Usage:
 *   k6 run tests/load/auth.k6.js
 *   k6 run -e BASE_URL=http://staging.example.com/api/v1 tests/load/auth.k6.js
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
    http_req_duration: ['p(95)<500'], // 95th percentile under 500ms
  },
};

export default function () {
  const payload = JSON.stringify({ userId: 1 });
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/auth/dev-login`, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
