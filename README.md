# xny-tracker

高考备考课程追踪系统，用于追踪和展示 xnykcxt 学习平台上的课程和试卷更新。

## 功能

- 多账号登录管理
- 课程/试卷列表展示
- 新内容标记提醒
- 按科目筛选
- 关键词搜索
- 试卷在线答题
- 课程附件预览

## 项目结构

```
├── pipeline/          # 数据获取脚本
│   └── fetch_data.py  # 从 xnykcxt API 获取数据
├── web/               # 前端页面
│   ├── index.html     # 主页面
│   └── server.js      # 本地代理服务器
└── data/              # 数据存储目录 (gitignore)
```

## 使用方法

### 启动前端

```bash
cd web
node server.js
# 访问 http://localhost:8080
```

### 获取数据 (可选)

```bash
export XNYKCXT_TOKEN="your_token_here"
python pipeline/fetch_data.py
```

## 注意事项

- Token 需通过环境变量 `XNYKCXT_TOKEN` 设置
- 数据文件不会上传到仓库
