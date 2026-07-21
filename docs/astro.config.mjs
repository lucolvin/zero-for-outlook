// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.zero-extension.com',
	integrations: [
		starlight({
			title: 'Zero for Outlook',
			logo: {
				src: './src/assets/zero-icon.svg',
				alt: 'Zero for Outlook',
			},
			favicon: '/favicon.ico',
			customCss: ['./src/styles/custom.css'],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/lucolvin/zero-for-outlook' }],
			components: {
				SocialIcons: './src/components/SocialIcons.astro',
			},
			sidebar: [
				{
					label: 'Guides',
					items: [{ autogenerate: { directory: 'guides' } }],
				},
				{
					label: 'Reference',
					items: [{ autogenerate: { directory: 'reference' } }],
				},
				{
					label: 'About',
					items: [{ autogenerate: { directory: 'about' } }],
				},
			],
		}),
	],
});
