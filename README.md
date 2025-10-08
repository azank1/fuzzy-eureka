# PoT-Consensus

**Proof of Task (PoT) Consensus** - AI-powered meta-orchestration framework for multi-agent task coordination.

---

## 🎯 Architecture Overview

```
PoT-Consensus/
├── src/
│   ├── core/              # Core orchestration engine
│   ├── adapters/          # Protocol adapters (HTTP, n8n, MCP)
│   ├── registry/          # Agent registry with REST API
│   └── sdk/               # CLI and SDKs
├── vendor/
│   └── claude-flow/       # Claude-Flow SDK (git submodule)
├── manifests/             # Agent configuration files
├── tests/                 # Test suites
└── data/                  # SQLite database
```

---

## 📐 Component Architecture

### **Core Components**

| Component | Purpose | Dependencies |
|-----------|---------|--------------|
| **ClaudePlanner** | AI-powered task decomposition | Claude-Flow SDK (local) |
| **Executor** | Sequential task execution | Adapters, ContextManager |
| **Orchestrator** | Main coordinator | Planner, Executor |
| **ContextManager** | Variable substitution & context | None |
| **Logger** | Logging utility | None |

### **Adapters**

| Adapter | Protocol | Use Case |
|---------|----------|----------|
| **HttpAdapter** | REST/HTTP | API calls, webhooks |
| **N8nAdapter** | n8n Webhooks | Workflow automation |
| **McpAdapter** | JSON-RPC 2.0 | Model Context Protocol |

### **Registry System**

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **API Server** | Express | REST API for agent management |
| **DatabaseManager** | SQLite | Agent storage and retrieval |

---

## 🔄 Data Flow

```
User Goal
  ↓
ClaudePlanner (AI decomposition)
  ↓
Task Plan [Task, Task, Task...]
  ↓
Executor (sequential execution)
  ↓
AdapterFactory (protocol routing)
  ↓
Adapter (HTTP/n8n/MCP)
  ↓
External Service
  ↓
Results Aggregation
  ↓
Final Output
```

---

## 🛠️ Dependencies

### Git Submodules
- **claude-flow**: `vendor/claude-flow` - AI-powered flow orchestration SDK
  - Repository: https://github.com/ruvnet/claude-flow.git
  - Usage: Task planning and decomposition

### Setup
```bash
# Initialize and update submodules
git submodule init
git submodule update

# Or clone with submodules
git clone --recurse-submodules <repo-url>
```

---

## 🏗️ Current Status

**Phase**: Architecture Definition ✅

### Completed
- ✅ Directory structure created
- ✅ Component placeholders defined
- ✅ Manifest templates created
- ✅ Test structure defined
- ✅ Claude-Flow added as git submodule

### Pending
- ⏳ Component implementation
- ⏳ Integration testing
- ⏳ End-to-end demo
- ⏳ Documentation completion

---

## 📋 Next Steps

1. **Implement Core Components**
   - ClaudePlanner with Claude-Flow integration
   - Executor with context management
   - Orchestrator coordination logic

2. **Implement Adapters**
   - HTTP adapter with axios
   - n8n webhook integration
   - MCP JSON-RPC client

3. **Build Registry System**
   - Express REST API
   - SQLite database operations

4. **Create CLI Tool**
   - Commander-based CLI
   - Register/list/invoke commands

5. **Testing & Demo**
   - Unit tests for all components
   - Integration tests
   - Demo application

---

**Ready for implementation phase** 🚀
