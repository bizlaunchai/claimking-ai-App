import AdminCompanyDetail from './AdminCompanyDetail.jsx';
// AdminCompanyDetail is a client component that reads the [id] segment via
// useParams() — works the same way in Next 15+ where server-component `params`
// became a Promise. Matches the pattern used in app/accept-invite/[token].
export default function Page() { return <AdminCompanyDetail />; }
