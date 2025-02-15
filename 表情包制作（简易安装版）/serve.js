const http = require('http');
// 获取命令行参数
const args = process.argv;

// 从第三个元素开始获取传入的参数
const commandLineArgs = args.slice(2);

// 解析参数
let port = 3000; // 默认端口号

commandLineArgs.forEach(arg => {
    if (arg.startsWith('--port=')) {
        port = parseInt(arg.split('=')[1], 10);
    }
});

const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString() // 将 Buffer 对象转换为字符串
        });
        req.on('end', async () => {
            /*
              {
                port:2233,
                key:5000,
                texts:["我草","洛天依"],
                images:["blob1","blob2"]
              }
            */
            body = JSON.parse(body)
            console.log(JSON.stringify(body))
            const formData = new FormData();
            const url = `http://localhost:${body.port}/memes/${body.key}/`
            if (body.texts == [] ){
                // 啥也不干
            }else{
                body.texts.forEach(v => {
                    formData.append('texts', v)
                })
            }
            if (body.images == [] ){
                // 啥也不干
            }else{
                body.images.forEach(v => {
                    formData.append('images', v)
                })
            }

            const options = {
                method: 'POST',
                // headers: {
                //     'User-Agent': 'Apipost/8 (https://www.apipost.cn)',
                //     'content-type': 'multipart/form-data; boundary=---011000010111000001101001'
                    
                // },
                body: formData,
                responseType: 'arraybuffer'
            };

            const data = await fetch(url, options).then(res => res.arrayBuffer());

            // res.write(buffer)
            const base64 = Buffer.from(data,"binary" ).toString("base64");
            
            res.write(JSON.stringify({data:base64}))
            res.end();
        })
    } else {
        res.end('Only POST requests are accepted');
    }
});


server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});