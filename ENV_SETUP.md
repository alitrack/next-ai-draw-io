# 环境变量配置指南

## 快速开始

### 方式 1：使用 .env.local（推荐）

**用于本地开发和生产环境，不会被提交到 git**

1. **复制模板文件**：
   ```bash
   cp .env.local.example .env.local
   ```

2. **编辑配置**：
   打开 `.env.local` 并设置你的 API keys：
   ```env
   AI_PROVIDER=openai
   AI_MODEL=gpt-4
   OPENAI_API_KEY=sk-...
   ```

3. **自动应用到所有环境**：
   - 开发环境（`npm run dev`）：自动读取项目根目录的 `.env.local`
   - 生产环境（Tauri 应用）：构建时自动复制到 `out/.env.local`
   - Portable 包：更新时自动包含

### 方式 2：使用 .env.production.local

**仅用于生产环境，优先级高于 .env.local**

创建 `.env.production.local` 在项目根目录，构建时会优先使用这个文件。

## 文件位置

### 开发环境
```
next-ai-draw-io/
├── .env.local          ← 在这里配置（开发 + 生产）
├── .env.local.example  ← 模板文件
└── ...
```

### 生产构建后
```
out/
├── .env.local          ← 自动复制（由构建脚本）
├── server.js
└── ...
```

### Portable 包
```
portable/
├── next-ai-draw-io.exe
├── out/
│   ├── .env.local      ← 自动复制（由构建脚本）
│   ├── server.js
│   └── ...
└── README.md
```

## 构建流程

当你运行以下命令时，环境变量会自动处理：

```bash
# 完整构建（Next.js + Tauri）
npm run tauri:build

# 或仅准备 Next.js 资源
node scripts/build-desktop-prepare.js
```

**自动复制逻辑**（优先级从高到低）：
1. `.env.production.local` → `out/.env.production.local`
2. `.env.local` → `out/.env.local`
3. `.env.production` → `out/.env.production`
4. `.env` → `out/.env`

只会复制第一个找到的文件。

## 环境变量优先级

Next.js 加载环境变量的优先级（从高到低）：

1. `.env.production.local` - 生产本地覆盖
2. `.env.local` - 本地覆盖（**推荐使用**）
3. `.env.production` - 生产环境默认
4. `.env` - 所有环境默认

`.env.local` 和 `.env.production.local` 会被 git 忽略，适合存放敏感信息。

## 配置示例

### OpenAI 配置
```env
AI_PROVIDER=openai
AI_MODEL=gpt-4-turbo
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1  # 可选
```

### AWS Bedrock 配置
```env
AI_PROVIDER=bedrock
AI_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Anthropic 配置
```env
AI_PROVIDER=anthropic
AI_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sk-ant-...
```

### 访问控制（可选）
```env
ACCESS_CODE_LIST=secret-code-1,secret-code-2
```

## 常见问题

### Q: 我应该用 .env 还是 .env.local？

**A:** 使用 `.env.local`
- ✅ 不会被 git 提交（安全）
- ✅ 同时适用于开发和生产环境
- ✅ 优先级高于 `.env`

### Q: 修改环境变量后需要重新构建吗？

**A:** 是的
- **开发环境**：重启 `npm run dev`
- **生产环境**：重新运行 `node scripts/build-desktop-prepare.js` 或 `npm run tauri:build`

### Q: Portable 包的环境变量在哪里？

**A:** 在 `portable/out/.env.local`
- 由构建脚本自动复制
- 如需修改，可以直接编辑这个文件，然后重启应用

### Q: 为什么我的 API key 不生效？

**A:** 检查以下几点：
1. 文件名是否正确（`.env.local`，注意前面的点）
2. 文件位置是否正确（开发环境在项目根目录，生产环境在 `out/` 目录）
3. 是否重新构建或重启了应用
4. 检查控制台是否有环境变量相关的错误信息

## 分发 Portable 包

**重要**：分发 portable 包时，请注意：

### 方式 1：不包含 API keys（推荐）

1. 删除 `portable/out/.env.local`
2. 打包分发
3. 让用户自行创建 `portable/out/.env.local` 并配置

### 方式 2：包含 API keys

1. 确保 `portable/out/.env.local` 中的 API keys 可以公开分享
2. 或使用 `ACCESS_CODE_LIST` 限制访问

## Git 配置

`.gitignore` 已配置，以下文件不会被提交：
```gitignore
.env*.local
.env.production
```

安全的做法：
- ✅ 提交 `.env.local.example`（模板）
- ❌ 不要提交 `.env.local`（包含密钥）
- ❌ 不要提交 `.env.production.local`（包含密钥）

---

**提示**：完整的环境变量配置选项，请查看 `.env.local.example` 文件。
