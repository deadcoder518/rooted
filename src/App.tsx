import { RouterProvider, useRouter } from '@/lib/router';
import Dashboard from '@/views/Dashboard';
import TreeEditor from '@/views/TreeEditor';
import JoinLobby from '@/views/JoinLobby';

function Routes() {
  const { path } = useRouter();

  if (path === '/' || path === '') return <Dashboard />;
  if (path.startsWith('/join/')) {
    const token = path.slice('/join/'.length);
    return <JoinLobby token={token} />;
  }
  if (path.startsWith('/tree/')) {
    const treeId = path.slice('/tree/'.length);
    return <TreeEditor treeId={treeId} />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <RouterProvider>
      <Routes />
    </RouterProvider>
  );
}
