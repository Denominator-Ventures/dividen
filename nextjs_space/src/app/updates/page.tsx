import { Metadata } from 'next';
import { UpdatesPage } from '@/components/updates/UpdatesPage';

export const metadata: Metadata = {
  title: 'Updates — DiviDen',
  description: 'What we shipped, why we shipped it, and what it means for the future of work.',
};

export default function Page() {
  return <UpdatesPage />;
}
