export default function PublicProdukLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="id">
			<body className="bg-gray-50 min-h-screen">{children}</body>
		</html>
	);
}
