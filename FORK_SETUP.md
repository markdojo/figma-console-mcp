# Fork Setup Guide

This document helps you set up your fork of figma-console-mcp for publication.

## Quick Setup Checklist

### 1. Update Repository Information

**package.json:**
- [ ] Replace `YOUR_GITHUB_USERNAME` with your GitHub username
- [ ] Replace `YOUR_NAME` with your name (or keep empty if preferred)

**README.md:**
- [ ] Replace all instances of `YOUR_GITHUB_USERNAME` with your GitHub username
- [ ] Review remote server URLs - either:
  - Keep as-is to use original project's server (`figma-console-mcp.southleft.com`)
  - Or replace with your own deployment URL if hosting your own server

### 2. Remote Server URLs (Optional)

If you're deploying your own remote server, update these URLs in README.md:
- `https://figma-console-mcp.southleft.com/sse` → Your deployment URL

If you're using the original project's server, you can leave these as-is.

### 3. Verify Attribution

The following files already include proper attribution to the original project:
- ✅ README.md - Credits section added
- ✅ CHANGELOG.md - Credits section added
- ✅ package.json - `originalRepository` field added

### 4. Search & Replace

Use your editor's find & replace to quickly update:

**Find:** `YOUR_GITHUB_USERNAME`  
**Replace:** `your-actual-username`

**Find:** `YOUR_NAME`  
**Replace:** `Your Name` (or leave empty)

### 5. Test Your Fork

After updating:
- [ ] Run `npm run build` to verify everything compiles
- [ ] Test the MCP server locally
- [ ] Verify all links work correctly

## Files Updated

The following files have been prepared with placeholders:
- `package.json` - Repository URL and author
- `README.md` - GitHub URLs and credits section
- `CHANGELOG.md` - Credits section

## Original Project

**Original Repository:** https://github.com/southleft/figma-console-mcp  
**Original Author:** southleft  
**License:** MIT

---

**Ready to publish?** After completing the checklist above, you're all set to push to your GitHub repository!
