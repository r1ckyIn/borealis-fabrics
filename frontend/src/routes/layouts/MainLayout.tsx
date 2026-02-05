/**
 * Main application layout with sidebar and header.
 *
 * This is a placeholder that will be fully implemented in Task 1.6.
 */

import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div style={{ padding: 24 }}>
      <Outlet />
    </div>
  );
}
