# Adding New Documents to RagVault

## Automatic Method (Recommended)

1. **Drop your file** into `data/uploads/` folder
   - Supported: PDF, DOCX, TXT, DOC, MD

2. **Run the refresh script:**
   ```bash
   ./refresh.sh
   ```

3. **Wait 15-20 seconds** for services to restart

4. **Done!** Your document is indexed and searchable

## What the refresh script does:
- Clears old cache
- Auto-detects all files in `data/uploads/`
- Rebuilds search indices  
- Restarts LLM server and Streamlit UI

## Manual Method (Advanced)

If you prefer manual control:
```bash
# Clear cache
find cache -type f -delete

# Rebuild indices
python init_cache_data.py  

# Restart  
./start.sh
```

---

**Note**: The system now automatically scans `data/uploads/` - you don't need to edit config files!
