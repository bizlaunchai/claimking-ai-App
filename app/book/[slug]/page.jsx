import BookPage from './BookPage.jsx';

export const metadata = {
    title: 'Book an Appointment | ClaimKing AI',
    description: 'Pick a time that works for you.',
};

export default async function Page({ params }) {
    const { slug } = await params;
    return <BookPage slug={slug} />;
}
