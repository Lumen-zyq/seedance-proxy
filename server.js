const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();
const PORT = process.env.PORT || 3000;
const ARK_API_KEY = process.env.ARK_API_KEY;
const ARK_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";

app.use(express.json());

// 健康检测接口
app.get('/health', (req, res)=>{
  res.json({ok:true});
});

// 创建视频任务
app.post('/api/video', async (req,res)=>{
  try{
    const {prompt, negative_prompt="", imageUrls, ratio="9:16", duration=4, resolution="720p"} = req.body;
    const payload = {
      model:"doubao-seedance-2-0-260128",
      prompt,
      negative_prompt,
      image_urls: imageUrls,
      duration,
      resolution,
      aspect_ratio: ratio
    };
    const resp = await fetch(ARK_ENDPOINT,{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${ARK_API_KEY}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify(payload)
    });
    const data = await resp.json();
    res.json(data);
  }catch(err){
    res.status(500).json({error:err.message})
  }
});

// 查询任务状态
app.get('/api/video/:taskId', async (req,res)=>{
  try{
    const taskId = req.params.taskId;
    const resp = await fetch(`${ARK_ENDPOINT}/${taskId}`,{
      headers:{
        "Authorization":`Bearer ${ARK_API_KEY}`
      }
    });
    const data = await resp.json();
    res.json(data);
  }catch(err){
    res.status(500).json({error:err.message})
  }
});

// 静态测试页面
app.get('/', (req,res)=>{
res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Seedance2.0代理测试台</title>
</head>
<body>
<h2>视频生成测试</h2>
<input id="prompt" placeholder="提示词"><br/>
<input id="imgUrl" placeholder="公网参考图URL"><br/>
<button onclick="createTask()">创建任务</button>
<div id="result"></div>
<script>
let taskId = null;
async function createTask(){
  const prompt = document.getElementById('prompt').value;
  const imgUrl = document.getElementById('imgUrl').value;
  const res = await fetch("/api/video",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt,imageUrls:[{url:imgUrl}],duration:4})
  });
  const json = await res.json();
  taskId = json.id;
  document.getElementById("result").innerText="任务ID:"+taskId+"，开始轮询";
  poll();
}
async function poll(){
  const r = await fetch("/api/video/"+taskId);
  const d = await r.json();
  if(d.status=="succeeded"){
    document.getElementById("result").innerHTML="完成<br><video controls src="+d.output.video_url+" width=400></video>";
  }else if(d.status=="failed"){
    document.getElementById("result").innerText="任务失败："+d.error;
  }else{
    document.getElementById("result").innerText="任务状态："+d.status+"，等待中";
    setTimeout(poll,3000);
  }
}
</script>
</body>
</html>
`)
})

app.listen(PORT,()=>{
  console.log(`Server start on port ${PORT}`)
})
