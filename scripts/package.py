import json, pathlib, zipfile, hashlib
root=pathlib.Path(__file__).resolve().parent.parent
meta=json.loads((root/'dist/plugin.json').read_text())
plugin_id=meta['id']; version=meta['info']['version']
out=root/'artifacts';out.mkdir(exist_ok=True)
archive=out/f'{plugin_id}-{version}.zip'
assert (root/'dist/module.js').is_file()
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for file in sorted((root/'dist').rglob('*')):
  if file.is_file():
   name=f'{plugin_id}/{file.relative_to(root / "dist").as_posix()}'
   info=zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
   info.external_attr=0o100644 << 16
   info.compress_type=zipfile.ZIP_DEFLATED
   z.writestr(info,file.read_bytes())
with zipfile.ZipFile(archive) as z:
 assert f'{plugin_id}/plugin.json' in z.namelist()
 assert all(n.startswith(plugin_id+'/') and '..' not in n.split('/') for n in z.namelist())
for algorithm in ('sha256','sha1'):
 digest=hashlib.new(algorithm,archive.read_bytes()).hexdigest()
 (out/(archive.name+'.'+algorithm)).write_text(digest+'  '+archive.name+'\n')
 print(algorithm,digest)
print(archive)
