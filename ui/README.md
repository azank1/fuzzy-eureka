# 🎛️ MetaOrcha Developer Dashboard

## Overview

A real-time web dashboard for monitoring and testing the MetaOrcha orchestration system. This UI provides visual feedback for agent workflows, execution logs, and system status.

## Features

### ✨ **Real-Time Orchestration Visualization**
- Live workflow execution with step-by-step progress
- Visual status indicators (pending, running, completed, error)
- Animated progress with pulse effects

### 📊 **Developer Monitoring Tools**
- **Execution Context Display**: Real-time JSON context updates
- **Live Logging**: Terminal-style log output with success/error highlighting
- **Agent Registry**: View all registered agents with tags and costs
- **System Status**: Connection status and execution progress

### 🎮 **Interactive Controls**
- **Run Food Ordering Demo**: Multi-step validation → pricing → payment workflow
- **Run Document Processing Demo**: Text extraction → summarization → translation
- **Reset System**: Clear all state and start fresh

### 🌐 **WebSocket Integration**
- Real-time bidirectional communication
- Automatic reconnection on disconnect
- Live status updates during execution

## Quick Start

```bash
# From the MetaOrcha root directory
cd ui
npm install
npm start
```

Then open: **http://localhost:3000**

## Architecture

```
ui/
├── server.js          # Express + WebSocket server
├── package.json       # Dependencies
└── public/
    └── index.html     # Dashboard frontend
```

### Backend (server.js)
- **Express Server**: Serves the dashboard and API endpoints
- **WebSocket Server**: Real-time communication with frontend
- **Orchestrator Integration**: Imports and runs MetaOrcha engine
- **Visual Execution**: Adds delays and status updates for UI feedback

### Frontend (index.html)
- **Modern UI**: Gradient design with animations
- **Responsive Layout**: Works on desktop and mobile
- **Real-time Updates**: WebSocket client for live data
- **Interactive Controls**: Buttons for running demos and system reset

## API Endpoints

- `GET /api/status` - Get current orchestration state
- `POST /api/run/:demoType` - Start orchestration demo
- `POST /api/reset` - Reset system state

## WebSocket Messages

### Client → Server
```json
{
  "type": "run_demo",
  "demoType": "food_ordering"
}
```

### Server → Client
```json
{
  "type": "step_started",
  "data": {
    "stepIndex": 0,
    "step": { "id": "validate-order", "status": "running" },
    "context": { ... }
  }
}
```

## Demo Workflows

### 🍕 Food Ordering Demo
1. **Order Validator** - Validates order items and customer info
2. **Cost Calculator** - Calculates subtotal, tax, delivery, and total
3. **Payment Processor** - Processes payment and generates transaction ID

### 📄 Document Processing Demo  
1. **Text Extractor** - Extracts text from document
2. **Text Summarizer** - Creates summary with key points
3. **Translator** - Translates summary to Spanish

## Developer Features

### 🔍 **Real-Time Debugging**
- Watch context data flow between agents
- Monitor execution logs with timestamps
- Visual step-by-step workflow progression

### 🏗️ **System Monitoring**
- Agent registration and metadata display
- Connection status and system health
- Execution timing and performance metrics

### 🎯 **Testing Interface**
- One-click demo execution
- Error handling and display
- System reset for clean testing

## Future Enhancements

- [ ] **Custom Workflow Builder** - Drag-and-drop agent chaining
- [ ] **Performance Metrics** - Execution timing, cost tracking
- [ ] **Agent Marketplace** - Browse and install new agents
- [ ] **Multi-User Support** - Team collaboration features
- [ ] **Historical Data** - Execution history and analytics
- [ ] **Production Monitoring** - Live system health in production

## Usage

1. **Start Dashboard**: Navigate to http://localhost:3000
2. **Run Demo**: Click "Run Food Ordering Demo" or "Run Document Processing Demo"
3. **Watch Execution**: See real-time progress in the workflow panel
4. **Monitor Logs**: Check execution logs for detailed information
5. **View Context**: Watch data flow between agents in JSON format
6. **Reset**: Clear system state with the "Reset System" button

The dashboard serves as both a demo tool and a foundation for production monitoring as MetaOrcha evolves!