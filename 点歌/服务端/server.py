import json
import os
from pathlib import Path
import sqlite3
import sys
from typing import Any, Dict
from urllib.parse import urlparse
import fastapi
from fastapi.staticfiles import StaticFiles
import requests
from tqdm import tqdm

app = fastapi.FastAPI()

def load_config_with_template(
    config_path: str,
    default_template: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    加载配置文件，如果不存在则显示错误并退出
    
    :param config_path: 配置文件路径
    :param default_template: 可选的默认配置模板（用于生成示例）
    :return: 配置字典
    """
    if not os.path.exists(config_path):
        print(f"错误：所需的配置文件 '{config_path}' 不存在")
        
        if default_template is not None:
            print("\n已创建配置文件，请修改内容并重新启动:")
            with open(config_file,'+w',encoding='utf-8') as f:
                f.write(json.dumps(default_template, indent=4))
        
        sys.exit(1)
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"错误：配置文件 '{config_path}' 不是有效的JSON格式")
        print(f"错误详情: {str(e)}")
        print("请检查并修正配置文件格式")

        sys.exit(1)
    except Exception as e:
        print(f"读取配置文件时发生错误: {str(e)}")
        sys.exit(1)

CONFIG_TEMPLATE = {
        "server_url": "http://net.ease.music.lovesealdice.online/",
        "cookie": "",
        "local_server":"http://127.0.0.1:8000/"
    }
    
config_file = "config.json"
config = load_config_with_template(config_file, CONFIG_TEMPLATE)

class Sql:
    def __init__(self, db_name):
        self.conn = sqlite3.connect(db_name)
        self.conn.row_factory = sqlite3.Row

    def create_tables(self):
        cursor = self.conn.cursor()
        cursor.execute('''
CREATE TABLE IF NOT EXISTS song (
    songid INTEGER PRIMARY KEY AUTOINCREMENT,
    imageurl TEXT NOT NULL,
    singer TEXT NOT NULL,
    songname TEXT NOT NULL,
    album INTEGER NOT NULL
)
''')
        self.conn.commit()
        
    def add_song(self, songid, img_url ,singer,song_name,album):
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                "INSERT INTO song (songid, imageurl, singer, songname,album) VALUES (?, ?, ? ,? ,?)",
                (songid, img_url ,singer,song_name,album)
            )
            self.conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        
    def get_song(self, song):
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM song WHERE songid = ?", (song,))
        return cursor.fetchone()
    
    def get_random_matching_item(self, condition):
        cursor = self.conn.cursor()
    
        query = f"""
        SELECT *
        FROM song
        WHERE {condition}
        ORDER BY RANDOM()
        LIMIT 1
        """
    
        cursor.execute(query)
        result = cursor.fetchone()

        return result
    
    def get_random_item(self):
        cursor = self.conn.cursor()
    
        query = f"""
        SELECT *
        FROM song
        ORDER BY RANDOM()
        LIMIT 1
        """
    
        cursor.execute(query)
        result = cursor.fetchone()

        return result
    
    def check_value_exists(self, table, column, value):
        """
        检查值是否存在于数据库表中
    
        参数:
            db_path: 数据库文件路径
            table: 表名
            column: 列名
            value: 要检查的值
    
        返回:
            bool: 是否存在
        """
        cursor = self.conn.cursor()
        
        # 方法1: 使用EXISTS (推荐)
        cursor.execute(
            f"SELECT EXISTS(SELECT 1 FROM {table} WHERE {column}=?)", 
            (value,)
        )
        exists = cursor.fetchone()[0]
        
        # 方法2: 使用COUNT
        # cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE {column}=?", (value,))
        # exists = cursor.fetchone()[0] > 0
        
        return bool(exists)
    
    def close(self):
        self.conn.close()

def check_file_exist(file_path):
    """检查文件是否存在"""
    return Path(file_path).is_file()
        
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Cookie':config["cookie"]
}


def download_file(url: str, file_path: str):
    """
    使用tqdm显示下载进度
    
    参数:
        url (str): 下载URL
        file_path (str): 本地保存路径
    """
    try:
        response = requests.get(url, stream=True, timeout=10)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        
        if file_path.endswith('/') or os.path.isdir(file_path):
            filename = os.path.basename(urlparse(response.url).path) or "downloaded_file"
            file_path = os.path.join(file_path, filename)
        
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, 'wb') as file, tqdm(
            desc=os.path.basename(file_path),
            total=total_size,
            unit='iB',
            unit_scale=True,
            unit_divisor=1024,
        ) as bar:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    size = file.write(chunk)
                    bar.update(size)
        
        return os.path.abspath(file_path)
    
    except Exception as e:
        print(f"下载失败: {e}")
        raise

def get_song_info(songid:int):
    """_summary_
    获取音乐的信息

    Args:
        songid (int): 歌曲 id
    Returns:
        object: 音乐的详情
    """
    return requests.get(f"{config['server_url']}/song/detail?ids={songid}").json()

def while_not_exist_handler(songid: int, singer: str, song_name: str):
    """
    当语音文件不存在时的处理函数，下载歌曲文件
    
    Args:
        songid (int): 音乐ID
        singer (str): 歌手名字
        song_name (str): 音乐名字
    
    Returns:
        None
    
    Raises:
        HTTPException: 当任何步骤失败时抛出带状态码的错误
    """
    try:
        response = requests.get(
            f"{config['server_url']}/song/download/url?id={songid}",
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        
        download_data = response.json()
        download_url = download_data["data"]["url"]
        
        if not download_url:
            raise ValueError("API未返回有效的下载URL")
        
        parsed_url = urlparse(download_url)
        if not all([parsed_url.scheme, parsed_url.netloc]):
            raise ValueError(f"无效的下载URL格式: {download_url}")
        
        
        filename = f"{song_name}feat.{singer}.flac"
        save_path = os.path.join("music", singer, filename)
        
        download_file(download_url, save_path)
        
        if not os.path.exists(save_path) or os.path.getsize(save_path) == 0:
            raise RuntimeError("文件下载后验证失败")
            
        return save_path
        
    except requests.exceptions.RequestException as e:
        raise fastapi.HTTPException(
            status_code=502,
            detail=f"获取下载链接失败: {str(e)}"
        )
    except ValueError as e:
        raise fastapi.HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise fastapi.HTTPException(
            status_code=500,
            detail=f"下载处理失败: {str(e)}"
        )


@app.get("/test")
def test(songid: int =1357375695):
    r = get_song_info(songid)
    singer = r["songs"][0]["ar"][0]["name"]
    song_name = r["songs"][0]["name"]
    img_url = r["songs"][0]["al"]["picUrl"]
    album_id = r["songs"][0]["al"]["id"]
    sql = Sql("music_data.db")
    sql.create_tables()
    if sql.check_value_exists("song","songid",songid):
        return  {
            "song_name":song_name,
            "img_url":img_url,
            "singer":singer,
            "file":f"{config['local_server']}{singer}/{song_name}feat.{singer}.flac",
            "status":200
        }
    else:
            download_success = False
            try:
                file_path = while_not_exist_handler(songid, singer, song_name)
                if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
                    download_success = True
            except Exception as download_error:
                download_success = False
                print(f"下载失败: {str(download_error)}")
            
            if download_success:
                sql.add_song(songid, img_url, singer, song_name, album_id)
                return {
                    "song_name": song_name,
                    "img_url": img_url,
                    "singer": singer,
                    "file": f"{config['local_server']}{singer}/{song_name}feat.{singer}.flac",
                    "status":200
                }
            else:
                return {
                    "song_name": song_name,
                    "img_url": img_url,
                    "singer": singer,
                    "file": None,
                    "message": "歌曲下载失败，请稍后再试",
                    "status":400
                }

app.mount("/", StaticFiles(directory="music", html=True), name="static")