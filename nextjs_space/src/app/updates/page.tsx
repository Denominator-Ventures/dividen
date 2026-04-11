import { Metadata } from 'next';
import { UpdatesPage } from '@/components/updates/UpdatesPage';

export const metadata: Metadata = {
  title: 'Updates',
  description: 'What we shipped, why we shipped it, and what it means for the future of work.',
  openGraph: {
    title: 'DiviDen Updates',
    description: 'What we shipped, why we shipped it, and what it means for the future of work.',
    images: [{ url: '/api/og?title=DiviDen+Updates&subtitle=What+we+shipped%2C+why+we+shipped+it%2C+and+what+it+means.&tag=changelog', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DiviDen Updates',
    description: 'What we shipped, why we shipped it, and what it means for the future of work.',
    images: ['/api/og?title=DiviDen+Updates&subtitle=What+we+shipped%2C+why+we+shipped+it%2C+and+what+it+means.&tag=changelog'],
  },
};

export default function Page() {
  return <UpdatesPage />;
}
