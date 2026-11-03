"""Verify a version URL before promotion; preserve routes and roll back on failure.

Only the existing static Worker is changed. No database write/delete operations.
The token is supplied by GitHub Actions secrets and is never written to files.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlsplit
import json
import os
import subprocess
import uuid
import verify_deploy

ROOT=Path(__file__).resolve().parents[1]
WORKER='hotel-agava-website'
ACCOUNT='a954a79fb6767ac99af33f832a5a107b'
CLI=ROOT/'node_modules/.bin/wrangler'

def current_versions():
    token=os.environ.get('CLOUDFLARE_API_TOKEN')
    if not token:raise RuntimeError('Publishing credential is missing; production unchanged.')
    req=Request(f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/workers/scripts/{WORKER}/deployments',headers={'Authorization':'Bearer '+token})
    with urlopen(req,timeout=30) as res:data=json.load(res)
    if not data.get('success'):raise RuntimeError('Cannot read current deployment')
    deployments=data['result']['deployments']
    if not deployments:raise RuntimeError('Existing production deployment is required')
    latest=deployments[0]  # Cloudflare returns newest first (same as Wrangler).
    return latest['versions']

def upload():
    output=ROOT/'.wrangler'/('upload-'+str(uuid.uuid4())+'.jsonl')
    output.parent.mkdir(exist_ok=True)
    env={**os.environ,'WRANGLER_OUTPUT_FILE_PATH':str(output),'WRANGLER_SEND_METRICS':'false'}
    subprocess.run([str(CLI),'versions','upload','--keep-vars','--message','Automatic SEO and public content update'],cwd=ROOT,env=env,check=True)
    records=[json.loads(line) for line in output.read_text().splitlines() if line.strip()]
    entry=next(r for r in records if r.get('type')=='version-upload')
    version=entry['version_id'];uuid.UUID(version)
    preview=entry.get('preview_url') or ''
    url=urlsplit(preview)
    if entry.get('worker_name')!=WORKER or url.scheme!='https' or not url.hostname or not url.hostname.endswith('.workers.dev'):
        raise RuntimeError('A valid version preview is required; production unchanged.')
    return version,preview

def promote(version,message):
    uuid.UUID(version)
    subprocess.run([str(CLI),'versions','deploy',version+'@100','--yes','--message',message],cwd=ROOT,check=True)

def verify(base):
    verify_deploy.BASE=base.rstrip('/')
    verify_deploy.verify_with_retry()

def publish():
    before=current_versions()
    if len(before)!=1 or before[0]['percentage']!=100:
        raise RuntimeError('An existing split deployment requires review; production unchanged.')
    previous=before[0]['version_id'];uuid.UUID(previous)
    version,preview=upload()
    verify(preview)
    if current_versions()!=before:
        raise RuntimeError('Production changed during preview checks; skipping promotion.')
    try:
        promote(version,'Publish verified SEO and public content')
        verify('https://hotelagava.ge')
    except Exception:
        # Do not overwrite a deployment someone else made while checks ran.
        if current_versions()==[{'version_id':version,'percentage':100}]:
            promote(previous,'Restore previous version after failed publication check')
            if current_versions()!=before:raise RuntimeError('Rollback needs attention')
            print('Previous production version restored. Publication failed.')
        raise
    print('Verified version published successfully. Routes and database unchanged.')

if __name__=='__main__':publish()
