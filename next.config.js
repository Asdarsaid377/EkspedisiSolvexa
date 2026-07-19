const nextConfig = {
	output: "standalone",
	experimental: {
		optimizePackageImports: ["lucide-react", "recharts"],
	},
	turbopack: {
		resolveAlias: {
			"@opentelemetry/api": { browser: "./node_modules/@opentelemetry/api" },
		},
	},
};

module.exports = nextConfig;
