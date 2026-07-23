import glob

files = glob.glob('src/pages/*.jsx')

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        
        new_content = content.replace("useState('-id')", "useState('-created_at')")
        new_content = new_content.replace('value="-id"', 'value="-created_at"')
        new_content = new_content.replace('value="id"', 'value="created_at"')
        
        if content != new_content:
            with open(f, 'w', encoding='utf-8') as file:
                file.write(new_content)
            print(f"Updated {f}")
    except Exception as e:
        print(f"Failed {f}: {e}")
