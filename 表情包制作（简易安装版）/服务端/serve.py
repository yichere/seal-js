import hashlib
import os
import requests
import json
from fastapi import FastAPI, HTTPException, UploadFile
from pydantic import BaseModel
from pathlib import Path
from fastapi.responses import  StreamingResponse,FileResponse
import base64
from fake_useragent import UserAgent

app =  FastAPI()

class Req(BaseModel):
    key: str
    image: list
    text: list
    args: dict

def download_image_from_url(image_url, save_path):
    """
    从给定的 URL 下载图片并保存到本地文件。

    Args:
        image_url: 图片的 URL 地址 (字符串).
        save_path: 本地保存图片的完整路径 (字符串)，包括文件名和扩展名.

    Returns:
        True: 如果图片下载并保存成功.
        False: 如果下载或保存过程中发生错误.
    """
    try:
        # 发送 GET 请求获取图片内容，使用 stream=True 以支持大文件下载
        response = requests.get(image_url, stream=True, timeout=10)  # 添加 timeout 防止请求卡住
        print(image_url,save_path)
        # 检查请求是否成功 (状态码 200)
        response.raise_for_status()  # 如果状态码不是 200，会抛出 HTTPError 异常

        # 以二进制写入模式打开本地文件
        with open(save_path, 'wb') as file:
            # 遍历响应内容，分块写入本地文件，提高大文件下载效率
            for chunk in response.iter_content(chunk_size=1024):  # chunk_size 可以调整
                file.write(chunk)

        print(f"图片成功下载并保存到: {save_path}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"下载图片失败，网络请求错误: {e}")
        return False
    except IOError as e:
        print(f"保存图片失败，文件IO错误: {e}")
        return False

baseurl = "http://127.0.0.1:2233"

headers = {
    'User-Agent': UserAgent().random,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'cache-control': 'max-age=0',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'sec-ch-ua': """\"Not(A:Brand";v="99", "Microsoft Edge";v=\"133\", \"Chromium\";v=\"133\"""",
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '\"Windows\"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'upgrade-insecure-requests': '1',
    'Upgrade-Insecure-Requests': '1',
    'Sec-GPC': '1',
    'Referer': 'https://www.google.com/',
    'Connection': 'keep-alive',
}

def create_keywords_dict(all:dict) ->dict:
    result = {}
    for key,value in all.items():
        for i in value["keywords"]:
            result[i] = key
    return result

def keywords_get_key(keywords:str) -> str:
    return create_keywords_dict(get_info_all(get_list()))[keywords]

def sava_file_not_json(url,path):
    if Path(path).exists():
        None
    else:
        print(url)
        print(path)
        print(headers)
        r = requests.get(url,headers=headers,stream=True)
        with open(path, 'wb') as f:
            f.write(r.content)

def save_file(url,path) -> str:
    if Path(path).exists():
        with open(path, 'r') as f:
            return json.load(f)
        return
    else:
        r = requests.get(url)
        with open(path, 'wb') as f:
            f.write(r.content)
            s = json.loads(r.content)
        return s

def get_info_all(list:list) -> dict:
    if Path("info.json").exists():
        with open("info.json", 'r') as f:
            return json.load(f)
        return 
    else:
        s = {}
        for i in list:
            s[i] = get_info(i)
        with open("info.json", 'w') as f:
            json.dump(s, f ,indent=4)
        return s

def get_command() -> list:
    result = []
    key_list = get_list()
    all = get_info_all(key_list)
    for i in key_list:
        result.append(all[i]['keywords'])
    return result

def get_image(url:str) ->UploadFile:
    try:
        response = requests.get(url, stream=True, timeout=10)
        response.raise_for_status()  # 检查请求是否成功

        image_binary_data = response.content  # 获取二进制数据
        return ("image.jpg",image_binary_data,response.headers['Content-Type'])
    
    except requests.exceptions.RequestException as e:
        return {
            "status": "error",
            "message": str(e)
        }

def get_list() -> list:
    return save_file(f'{baseurl}/memes/keys/',"list.json")

def get_info(key:str) -> str: 
    return json.loads(requests.get(f'{baseurl}/memes/{key}/info').content)

@app.get("/{command}/key")
def keywords_get_key_api(command:str):
    return {"result":keywords_get_key(command)}

@app.get("/get_list")
def get_list():
    return save_file(f'{baseurl}/memes/keys/',"list.json")

@app.get("/get_command")
def get_command_api():
    return get_command()

@app.get("/{key}/preview")
def preview(key:str):
    # 这部分代码是 ai 写的
    try:
        response = requests.get(f'{baseurl}/memes/{key}/preview', stream=True, timeout=10) # stream=True for efficient downloading, timeout for safety
        response.raise_for_status() # 检查请求是否成功 (200 OK)

        content_type = response.headers.get("Content-Type") # 尝试从 headers 获取 Content-Type
        if not content_type:
            content_type = "image/jpeg" # 默认使用 image/jpeg，如果无法从 headers 获取

        return StreamingResponse(
            response.iter_content(chunk_size=1024*1024), # 流式读取内容, chunk_size 可调整
            media_type=content_type
        )

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error fetching image from URL: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
    
@app.get("/test")
def test():
    return create_keywords_dict(get_info_all(get_list()))


@app.post("/meme_generate")
def generator(request: Req):
    key = request.key
    text = request.text
    image = request.image
    
    form_data = {
        "texts":text,
        "args": request.args
    }
    
    files = []
    
    for url in image:
        file_path = hashlib.md5(url.encode('utf-8')).hexdigest()
        up = get_image(url)
        print(up)
        files.append(("images", up))

    r = requests.post(f'{baseurl}/memes/{key}',data=form_data,files=files).content
    re = base64.b64encode(r).decode("utf-8")
    
    return {
        "status":"success",
        "message":re
    }
    
@ app.get("/{key}/info")
def info(key:str):
    return get_info(key)

# 以后有时间自己写渲染
@app.get("/meme_list")
def list():
    return FileResponse("./meme_list.png", media_type="image/png")