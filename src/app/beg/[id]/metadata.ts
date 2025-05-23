import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const response = await fetch(
      `https://7dfinzalu3.execute-api.ap-south-1.amazonaws.com/dev/?method=get_beg_message&messageId=${params.id}`
    );
    const data = await response.json();
    const beg = data.data;

    if (!beg) {
      return {
        title: 'Beg Not Found | BegsFun',
        description: 'This beg doesn\'t exist or has been deleted',
      };
    }

    const imageUrl = `https://www.begsfun.xyz/beg/${params.id}/opengraph-image`;
    const title = `${beg.text.slice(0, 50)}${beg.text.length > 50 ? '...' : ''} | BegsFun`;
    const description = `${Number(beg.fillAmount).toFixed(2)} / ${Number(beg.solAmount).toFixed(2)} SOL - ${beg.text.slice(0, 150)}${beg.text.length > 150 ? '...' : ''}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `Beg by ${beg.walletAddress.slice(0, 4)}...${beg.walletAddress.slice(-4)}`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `Beg by ${beg.walletAddress.slice(0, 4)}...${beg.walletAddress.slice(-4)}`,
          },
        ],
        creator: '@begsfun',
        site: '@begsfun',
      },
    };
  } catch (e) {
    return {
      title: 'Error Loading Beg | BegsFun',
      description: 'There was an error loading this beg. Please try again later.',
    };
  }
} 