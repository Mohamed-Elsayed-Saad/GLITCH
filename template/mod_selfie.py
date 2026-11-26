#!/usr/bin/env python3
import os
import json
import utils

R = '\033[31m' # red
G = '\033[32m' # green
C = '\033[36m' # cyan
W = '\033[0m'  # white

redirect = os.getenv('REDIRECT')

with open('template/selfie/index_temp.html', 'r', encoding='utf-8') as temp_index:
    temp_index_data = temp_index.read()
    if redirect:
        temp_index_data = temp_index_data.replace(
            "var REDIRECT = 'REDIRECT_URL';",
            f"var REDIRECT = {json.dumps(redirect)};"
        )
        utils.print(f'{G}[+] {C}Redirect URL :{W} ' + redirect)
    if os.getenv('DEBUG_HTTP') == '1':
        temp_index_data = temp_index_data.replace('window.location = "https:" + restOfUrl;', '')

with open('template/selfie/index.html', 'w', encoding='utf-8') as updated_index:
    updated_index.write(temp_index_data)
