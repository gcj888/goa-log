# Deploying to Netlify

## Method 1: Drag & Drop (Easiest)

1. Run `npm run build` in your project
2. Go to https://app.netlify.com/drop
3. Drag the `dist` folder onto the page
4. Done! Your site is live

## Method 2: Netlify CLI

```bash
# Install Netlify CLI (one time)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Build your site
npm run build

# Deploy
netlify deploy

# If it looks good, deploy to production
netlify deploy --prod
```

## Method 3: GitHub Integration (Best for Ongoing Updates)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/goa-log.git
git push -u origin main
```

### 2. Connect to Netlify

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub"
4. Select your repository
5. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Click "Deploy site"

### 3. Add Environment Variables (If Using Sanity)

1. In Netlify dashboard, go to Site settings → Environment variables
2. Add:
   - `VITE_SANITY_PROJECT_ID` = your project ID
   - `VITE_SANITY_DATASET` = production
3. Redeploy

## Setting Up Custom Domain

### On Netlify:
1. Go to Domain settings
2. Click "Add custom domain"
3. Enter your domain (e.g., goa.log or log.yourdomain.com)

### On Your DNS Provider:
Add these records:

**For root domain (goa.log):**
- Type: A
- Name: @
- Value: 75.2.60.5

**For subdomain (log.yourdomain.com):**
- Type: CNAME
- Name: log
- Value: your-site-name.netlify.app

Wait 24-48 hours for DNS propagation.

## Continuous Deployment

With GitHub integration, every push to `main` branch automatically:
1. Triggers a build
2. Deploys to production
3. Updates your live site

**Branch deploys**: Push to other branches to get preview URLs automatically!

## Troubleshooting

### Build fails with "command not found"
- Make sure `package.json` has the correct build script
- Verify Node version (Netlify uses Node 18+ by default)

### Site shows blank page
- Check browser console for errors
- Verify Sanity project ID is correct in environment variables
- Make sure CORS is enabled in Sanity dashboard

### Images not loading
- Check that Sanity dataset is set to "production"
- Verify image URLs in Sanity query are correct

## Performance Tips

- Netlify's CDN makes your site fast globally
- Images from Sanity are automatically optimized
- Enable "Post Processing" in Netlify for asset optimization
- Consider adding "netlify.toml" for advanced configuration

---

Your site should deploy in under 1 minute! 🚀
