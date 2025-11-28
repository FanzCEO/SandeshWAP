import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as pty from "node-pty";
import { fileSystem } from "./fileSystem";
import * as path from "path";
import * as fs from "fs/promises";
import { getTemplates, getTemplateById } from "./templates";
import type { CreateProjectFromTemplateRequest, CreateProjectFromTemplateResponse } from "@shared/schema";
import { explainCommand, generateDockerfile, analyzeLogs, enhancedAIService } from "./ai-service";
import type { 
  AIProviderRequest,
  AIProviderResponse,
  AdultModeConsentRequest,
  AdultModeConsentResponse,
  AIProviderStatusResponse,
  SignUpData,
  LoginData,
  UpdateProfileData,
  UpdateOnboardingData,
  User
} from "@shared/schema";
import { signUpSchema, loginSchema, updateProfileSchema, updateOnboardingSchema } from "@shared/schema";
import { aiProviderRegistry } from "./ai-providers/registry";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ===== AUTHENTICATION ROUTES =====
  
  // Sign up
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = signUpSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, data.email)
      });
      
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      // Hash password if provided
      let hashedPassword = null;
      if (data.password) {
        hashedPassword = await bcrypt.hash(data.password, 10);
      }
      
      // Convert birthday string to timestamp if provided
      let birthday = null;
      if (data.birthday) {
        birthday = new Date(data.birthday);
      }
      
      // Create user
      const [newUser] = await db.insert(users).values({
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        displayName: data.displayName,
        birthday,
        ageVerified: !!birthday,
        onboardingStep: 1 // Start at step 1
      }).returning();
      
      // Set session
      req.session.userId = newUser.id;
      
      // Return user without sensitive data
      const { password: _, ...userWithoutPassword } = newUser;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      console.error("Sign up error:", error);
      res.status(400).json({ error: error.message || "Sign up failed" });
    }
  });
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.email, data.email)
      });
      
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Return user without sensitive data
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: error.message || "Login failed" });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });
  
  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.session.userId)
      });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return user without sensitive data
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update profile
  app.patch("/api/auth/profile", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const data = updateProfileSchema.parse(req.body);
      
      // Update user
      const [updatedUser] = await db.update(users)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(users.id, req.session.userId))
        .returning();
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return user without sensitive data
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(400).json({ error: error.message });
    }
  });
  
  // Update onboarding status
  app.patch("/api/auth/onboarding", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const data = updateOnboardingSchema.parse(req.body);
      
      // Update user
      const [updatedUser] = await db.update(users)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(users.id, req.session.userId))
        .returning();
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return user without sensitive data
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      console.error("Update onboarding error:", error);
      res.status(400).json({ error: error.message });
    }
  });
  
  // ===== PROJECT & FILE ROUTES =====
  
  // Get project info
  app.get("/api/project", async (req, res) => {
    try {
      const info = await fileSystem.getProjectInfo();
      res.json(info);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Change project directory
  app.post("/api/project/change", async (req, res) => {
    try {
      const { path: projectPath } = req.body;
      if (!projectPath) {
        return res.status(400).json({ error: "Missing project path" });
      }
      fileSystem.changeBasePath(projectPath);
      const info = await fileSystem.getProjectInfo();
      res.json(info);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List directory structure
  app.get("/api/files", async (req, res) => {
    try {
      const dirPath = (req.query.path as string) || '';
      const files = await fileSystem.readDirectory(dirPath);
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Read file content
  app.get("/api/file", async (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: "Missing path parameter" });
    }

    try {
      const content = await fileSystem.readFile(filePath);
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Write/update file content
  app.post("/api/file", async (req, res) => {
    try {
      const { path: filePath, content } = req.body;
      if (!filePath) {
        return res.status(400).json({ error: "Missing file path" });
      }
      await fileSystem.writeFile(filePath, content || '');
      res.json({ success: true, path: filePath });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Create new file
  app.post("/api/file/create", async (req, res) => {
    try {
      const { path: filePath, content } = req.body;
      if (!filePath) {
        return res.status(400).json({ error: "Missing file path" });
      }
      await fileSystem.createFile(filePath, content || '');
      res.json({ success: true, path: filePath });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Create new directory
  app.post("/api/directory/create", async (req, res) => {
    try {
      const { path: dirPath } = req.body;
      if (!dirPath) {
        return res.status(400).json({ error: "Missing directory path" });
      }
      await fileSystem.createDirectory(dirPath);
      res.json({ success: true, path: dirPath });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete file or directory
  app.delete("/api/file", async (req, res) => {
    try {
      const { path: targetPath } = req.body;
      if (!targetPath) {
        return res.status(400).json({ error: "Missing path" });
      }
      await fileSystem.delete(targetPath);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Rename file or directory
  app.post("/api/file/rename", async (req, res) => {
    try {
      const { oldPath, newName } = req.body;
      if (!oldPath || !newName) {
        return res.status(400).json({ error: "Missing oldPath or newName" });
      }
      const newPath = await fileSystem.rename(oldPath, newName);
      res.json({ success: true, newPath });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Move file or directory
  app.post("/api/file/move", async (req, res) => {
    try {
      const { sourcePath, targetDir } = req.body;
      if (!sourcePath || !targetDir) {
        return res.status(400).json({ error: "Missing sourcePath or targetDir" });
      }
      const newPath = await fileSystem.move(sourcePath, targetDir);
      res.json({ success: true, newPath });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Search in files
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Missing search query" });
      }
      
      const results = await fileSystem.searchInFiles(query, {
        caseSensitive: req.query.caseSensitive === 'true',
        maxResults: parseInt(req.query.maxResults as string) || 100
      });
      
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Helper routes
  app.post("/api/ai/dryrun", async (req, res) => {
    try {
      const { command } = req.body;
      if (!command) {
        return res.status(400).json({ error: "Command is required" });
      }

      const clientIp = req.ip || 'default';
      const explanation = await explainCommand(command, clientIp);
      res.json(explanation);
    } catch (error: any) {
      console.error('AI dryrun error:', error);
      res.status(error.message.includes('Rate limit') ? 429 : 500).json({ 
        error: error.message || "Failed to explain command" 
      });
    }
  });

  app.post("/api/ai/dockerfile", async (req, res) => {
    try {
      const { projectPath } = req.body;
      if (!projectPath) {
        return res.status(400).json({ error: "Project path is required" });
      }

      const clientIp = req.ip || 'default';
      const result = await generateDockerfile(projectPath, clientIp);
      res.json(result);
    } catch (error: any) {
      console.error('AI Dockerfile error:', error);
      res.status(error.message.includes('Rate limit') ? 429 : 500).json({ 
        error: error.message || "Failed to generate Dockerfile" 
      });
    }
  });

  app.post("/api/ai/logs", async (req, res) => {
    try {
      const { logs } = req.body;
      if (!logs) {
        return res.status(400).json({ error: "Logs are required" });
      }

      const clientIp = req.ip || 'default';
      const analysis = await analyzeLogs(logs, clientIp);
      res.json(analysis);
    } catch (error: any) {
      console.error('AI logs analysis error:', error);
      res.status(error.message.includes('Rate limit') ? 429 : 500).json({ 
        error: error.message || "Failed to analyze logs" 
      });
    }
  });

  // === NEW AI PROVIDER SYSTEM ROUTES ===

  // Get all available AI providers with health status
  app.get("/api/ai/providers", async (req, res) => {
    try {
      const providers = await enhancedAIService.getAvailableProviders();
      
      const response: AIProviderStatusResponse = {
        providers: providers.map(provider => ({
          id: provider.id,
          name: provider.name,
          type: provider.type,
          isHealthy: provider.isHealthy || false,
          latency: provider.latency,
          errorMessage: provider.errorMessage,
          availableModels: provider.availableModels || [],
          lastChecked: new Date()
        })),
        systemStatus: {
          totalProviders: providers.length,
          healthyProviders: providers.filter(p => p.isHealthy).length,
          adultModeEnabled: providers.some(p => p.compliance?.allowsAdultContent),
          totalRequests: 0, // Would be from audit logs
          errorRate: 0 // Would be calculated from recent requests
        }
      };
      
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get provider recommendations based on use case
  app.get("/api/ai/providers/recommendations", async (req, res) => {
    try {
      const useCase = req.query.useCase as 'general' | 'creative' | 'technical' | 'research' || 'general';
      const recommendations = enhancedAIService.getProviderRecommendations(useCase);
      res.json({ useCase, recommendations });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test provider connectivity
  app.post("/api/ai/providers/:providerId/test", async (req, res) => {
    try {
      const { providerId } = req.params;
      const status = await aiProviderRegistry.getProviderStatus(providerId);
      
      if (!status) {
        return res.status(404).json({ error: 'Provider not found' });
      }

      res.json({
        success: status.isHealthy,
        latency: status.latency,
        error: status.errorMessage,
        provider: providerId,
        lastChecked: status.lastChecked
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Enhanced AI generation with provider selection
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const requestData = req.body as AIProviderRequest;
      
      if (!requestData.messages || !Array.isArray(requestData.messages)) {
        return res.status(400).json({ error: "Missing or invalid messages array" });
      }

      const sessionId = (req as any).sessionID || req.ip || 'default';
      const clientIp = req.ip || 'unknown';
      
      const response = await enhancedAIService.generateResponse(
        requestData,
        sessionId,
        {
          defaultProvider: requestData.providerId,
          enableAdultMode: requestData.isAdultMode,
          enableAuditLogging: true
        }
      );

      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // === ADULT MODE MANAGEMENT ROUTES ===

  // Request Adult Mode consent
  app.post("/api/ai/adult-mode/consent", async (req, res) => {
    try {
      const consentRequest = req.body as AdultModeConsentRequest;
      const sessionId = (req as any).sessionID || req.ip || 'default';
      const clientIp = req.ip || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      if (!consentRequest.userAge || !consentRequest.acceptTerms) {
        return res.status(400).json({ 
          error: "Age verification and terms acceptance are required" 
        });
      }

      const response = await enhancedAIService.requestAdultModeConsent(
        sessionId,
        consentRequest,
        clientIp,
        userAgent
      );

      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Adult Mode consent status
  app.get("/api/ai/adult-mode/status", async (req, res) => {
    try {
      const sessionId = (req as any).sessionID || req.ip || 'default';
      const status = enhancedAIService.getAdultModeStatus(sessionId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Revoke Adult Mode consent
  app.post("/api/ai/adult-mode/revoke", async (req, res) => {
    try {
      const sessionId = (req as any).sessionID || req.ip || 'default';
      enhancedAIService.revokeAdultModeConsent(sessionId);
      res.json({ success: true, message: 'Adult Mode consent revoked' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // === ENHANCED LEGACY ENDPOINTS (with provider selection) ===

  // Enhanced command explanation with provider selection
  app.post("/api/ai/dryrun/enhanced", async (req, res) => {
    try {
      const { command, providerId, enableAdultMode } = req.body;
      if (!command) {
        return res.status(400).json({ error: "Missing command" });
      }
      
      const sessionId = (req as any).sessionID || req.ip || 'default';
      const explanation = await enhancedAIService.explainCommand(
        command,
        sessionId,
        {
          defaultProvider: providerId,
          enableAdultMode,
          fallbackProviders: ['anthropic', 'gemini']
        }
      );
      
      res.json(explanation);
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message || "Failed to explain command" 
      });
    }
  });

  // Enhanced Dockerfile generation with provider selection
  app.post("/api/ai/dockerfile/enhanced", async (req, res) => {
    try {
      const { projectPath = process.cwd(), providerId, enableAdultMode } = req.body;
      const sessionId = (req as any).sessionID || req.ip || 'default';
      
      const result = await enhancedAIService.generateDockerfile(
        projectPath,
        sessionId,
        {
          defaultProvider: providerId,
          enableAdultMode,
          fallbackProviders: ['anthropic', 'gemini']
        }
      );
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message || "Failed to generate Dockerfile" 
      });
    }
  });

  // Enhanced log analysis with provider selection
  app.post("/api/ai/logs/enhanced", async (req, res) => {
    try {
      const { logs, providerId, enableAdultMode } = req.body;
      if (!logs) {
        return res.status(400).json({ error: "Missing logs data" });
      }
      
      const sessionId = (req as any).sessionID || req.ip || 'default';
      const analysis = await enhancedAIService.analyzeLogs(
        logs,
        sessionId,
        {
          defaultProvider: providerId,
          enableAdultMode,
          fallbackProviders: ['perplexity', 'anthropic']
        }
      );
      
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message || "Failed to analyze logs" 
      });
    }
  });

  // === USAGE STATISTICS AND MONITORING ===

  // Get usage statistics
  app.get("/api/ai/usage", async (req, res) => {
    try {
      const sessionId = req.query.session as string;
      const stats = enhancedAIService.getUsageStats(sessionId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get detailed provider information
  app.get("/api/ai/providers/:providerId", async (req, res) => {
    try {
      const { providerId } = req.params;
      const provider = aiProviderRegistry.getProvider(providerId);
      
      if (!provider) {
        return res.status(404).json({ error: 'Provider not found' });
      }

      const status = await aiProviderRegistry.getProviderStatus(providerId);
      
      res.json({
        ...provider,
        status: {
          isHealthy: status?.isHealthy || false,
          latency: status?.latency,
          errorMessage: status?.errorMessage,
          lastChecked: status?.lastChecked
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all templates
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = getTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get template by ID
  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = getTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create project from template
  app.post("/api/project/create-from-template", async (req, res) => {
    try {
      const { templateId, projectName }: CreateProjectFromTemplateRequest = req.body;
      
      if (!templateId || !projectName) {
        return res.status(400).json({ error: "Missing templateId or projectName" });
      }

      // Get the template
      const template = getTemplateById(templateId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Generate unique project ID
      const projectId = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
      const projectsDir = path.join(process.cwd(), 'projects');
      const projectPath = path.join(projectsDir, projectId);

      // Create projects directory if it doesn't exist
      await fs.mkdir(projectsDir, { recursive: true });

      // Create project directory
      await fs.mkdir(projectPath, { recursive: true });

      // Create all template files
      for (const file of template.files) {
        const filePath = path.join(projectPath, file.path);
        const fileDir = path.dirname(filePath);
        
        // Create directory if needed
        await fs.mkdir(fileDir, { recursive: true });
        
        // Write file content
        await fs.writeFile(filePath, file.content, 'utf8');
      }

      // Create a project metadata file
      const metadata = {
        name: projectName,
        templateId: template.id,
        templateName: template.name,
        createdAt: new Date().toISOString(),
        commands: template.commands
      };
      await fs.writeFile(
        path.join(projectPath, '.project.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Change to the new project directory
      fileSystem.changeBasePath(projectPath);

      const response: CreateProjectFromTemplateResponse = {
        success: true,
        projectPath: projectPath,
        projectName: projectName,
        message: `Project '${projectName}' created successfully from template '${template.name}'`
      };

      res.json(response);
    } catch (error: any) {
      console.error('Error creating project from template:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for terminal PTY
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws/terminal' 
  });

  // WebSocket for file system changes
  const fsWss = new WebSocketServer({
    server: httpServer,
    path: '/ws/filesystem'
  });

  // Start file system watching
  fileSystem.startWatching((event) => {
    // Broadcast file system changes to all connected clients
    fsWss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(event));
      }
    });
  });

  fsWss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: 'connected' }));
  });

  wss.on("connection", (socket) => {
    let ptyProcess: pty.IPty | null = null;

    try {
      // Spawn shell process using node-pty
      const shell = process.platform === "win32" ? "powershell.exe" : "bash";
      ptyProcess = pty.spawn(shell, [], {
        name: "xterm-256color",
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: process.env as { [key: string]: string }
      });

      // Send initial terminal data
      socket.send("\r\n*** Terminal Connected ***\r\n");

      // Handle PTY data
      ptyProcess.onData((data: string) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(data);
        }
      });

      // Handle WebSocket messages
      socket.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === "input" && ptyProcess) {
            ptyProcess.write(data.data);
          } else if (data.type === "resize" && ptyProcess) {
            // Handle terminal resize
            ptyProcess.resize(data.cols || 80, data.rows || 30);
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      });

      // Cleanup on disconnect
      socket.on("close", () => {
        if (ptyProcess) {
          ptyProcess.kill();
          ptyProcess = null;
        }
      });

      // Handle PTY exit
      ptyProcess.onExit(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send("\r\n*** Terminal session ended ***\r\n");
          socket.close();
        }
      });
    } catch (error) {
      console.error("Failed to spawn PTY:", error);
      socket.send("\r\n*** Error: Failed to start terminal ***\r\n");
      socket.close();
    }
  });

  return httpServer;
}