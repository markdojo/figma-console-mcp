/**
 * Figma Desktop Connector
 *
 * This service connects directly to Figma Desktop's plugin context
 * to execute code with access to the full Figma Plugin API,
 * including variables without Enterprise access.
 *
 * Uses Puppeteer's Worker API to directly access plugin workers,
 * bypassing CDP context enumeration limitations.
 */

import { Page } from 'puppeteer-core';
import { logger } from './logger.js';

export class FigmaDesktopConnector {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Initialize connection to Figma Desktop's plugin context
   * No setup needed - Puppeteer handles worker access automatically
   */
  async initialize(): Promise<void> {
    logger.info('Figma Desktop connector initialized (using Puppeteer Worker API)');
  }

  /**
   * Execute code in Figma's plugin context where the figma API is available
   * Uses Puppeteer's direct worker access instead of CDP context enumeration
   */
  async executeInPluginContext<T = any>(code: string): Promise<T> {
    try {
      // Use Puppeteer's worker API directly - this can access plugin workers
      // that CDP's Runtime.getExecutionContexts cannot enumerate
      const workers = this.page.workers();

      // Log to browser console so MCP can capture it
      await this.page.evaluate((count, urls) => {
        console.log(`[DESKTOP_CONNECTOR] Found ${count} workers via Puppeteer API:`, urls);
      }, workers.length, workers.map(w => w.url()));

      logger.info({
        workerCount: workers.length,
        workerUrls: workers.map(w => w.url())
      }, 'Found workers via Puppeteer API');

      // Try each worker to find one with figma API
      for (const worker of workers) {
        try {
          // Log to browser console
          await this.page.evaluate((url) => {
            console.log(`[DESKTOP_CONNECTOR] Checking worker: ${url}`);
          }, worker.url());

          // Check if this worker has the figma API
          // Use string evaluation to avoid TypeScript errors about figma global
          const hasFigmaApi = await worker.evaluate('typeof figma !== "undefined"');

          // Log result to browser console
          await this.page.evaluate((url, hasApi) => {
            console.log(`[DESKTOP_CONNECTOR] Worker ${url} has figma API: ${hasApi}`);
          }, worker.url(), hasFigmaApi);

          if (hasFigmaApi) {
            logger.info({ workerUrl: worker.url() }, 'Found worker with Figma API');

            await this.page.evaluate((url) => {
              console.log(`[DESKTOP_CONNECTOR] ✅ SUCCESS! Found worker with Figma API: ${url}`);
            }, worker.url());

            // Execute the code in this worker context
            // Wrap the code in a function to ensure proper evaluation
            const wrappedCode = `(${code})`;
            const result = await worker.evaluate(wrappedCode);
            return result as T;
          }
        } catch (workerError) {
          // This worker doesn't have figma API or evaluation failed, try next
          await this.page.evaluate((url, err) => {
            console.error(`[DESKTOP_CONNECTOR] ❌ Worker ${url} check failed:`, err);
          }, worker.url(), workerError instanceof Error ? workerError.message : String(workerError));

          logger.error({ error: workerError, workerUrl: worker.url() }, 'Worker check failed, trying next');
          continue;
        }
      }

      // If no worker found with figma API, throw error
      throw new Error('No plugin worker found with Figma API. Make sure a plugin is running in Figma Desktop.');
    } catch (error) {
      logger.error({ error, code: code.substring(0, 200) }, 'Failed to execute in plugin context');
      throw error;
    }
  }


  /**
   * Get Figma variables from plugin UI window object
   * This bypasses Figma's plugin sandbox security restrictions
   * by accessing data that the plugin posted to its UI iframe
   */
  async getVariablesFromPluginUI(fileKey?: string): Promise<any> {
    try {
      // Log to browser console
      await this.page.evaluate((key) => {
        console.log(`[DESKTOP_CONNECTOR] 🚀 getVariablesFromPluginUI() called, fileKey: ${key}`);
      }, fileKey);

      logger.info({ fileKey }, 'Getting variables from plugin UI iframe');

      // Get all frames (iframes) in the page
      const frames = this.page.frames();

      await this.page.evaluate((count) => {
        console.log(`[DESKTOP_CONNECTOR] Found ${count} frames (iframes)`);
      }, frames.length);

      logger.info({ frameCount: frames.length }, 'Found frames in page');

      // Try to find plugin UI iframe with variables data
      for (const frame of frames) {
        try {
          // Check if frame is still attached before accessing it
          if (frame.isDetached()) {
            logger.debug('Skipping detached frame');
            continue;
          }

          const frameUrl = frame.url();

          await this.page.evaluate((url) => {
            console.log(`[DESKTOP_CONNECTOR] Checking frame: ${url}`);
          }, frameUrl);

          // Check if this frame has our variables data
          const hasData = await frame.evaluate('typeof window.__figmaVariablesData !== "undefined" && window.__figmaVariablesReady === true');

          await this.page.evaluate((url, has) => {
            console.log(`[DESKTOP_CONNECTOR] Frame ${url} has variables data: ${has}`);
          }, frameUrl, hasData);

          if (hasData) {
            logger.info({ frameUrl }, 'Found frame with variables data');

            await this.page.evaluate((url) => {
              console.log(`[DESKTOP_CONNECTOR] ✅ SUCCESS! Found plugin UI with variables data: ${url}`);
            }, frameUrl);

            // Get the data from window object
            const result = await frame.evaluate('window.__figmaVariablesData') as any;

            logger.info(
              {
                variableCount: result.variables?.length,
                collectionCount: result.variableCollections?.length
              },
              'Successfully retrieved variables from plugin UI'
            );

            await this.page.evaluate((varCount, collCount) => {
              console.log(`[DESKTOP_CONNECTOR] ✅ Retrieved ${varCount} variables in ${collCount} collections`);
            }, result.variables?.length || 0, result.variableCollections?.length || 0);

            return result;
          }
        } catch (frameError) {
          const errorMsg = frameError instanceof Error ? frameError.message : String(frameError);
          const isDetachedError = errorMsg.includes('detached') || errorMsg.includes('Execution context was destroyed');

          // Safely get frame URL (may fail if frame is detached)
          let safeFrameUrl = 'unknown';
          try {
            safeFrameUrl = frame.url();
          } catch {
            safeFrameUrl = '(detached)';
          }

          if (isDetachedError) {
            logger.debug({ frameUrl: safeFrameUrl }, 'Frame was detached during variables check, trying next');
          } else {
            // Only log to browser console if we can (page may still be accessible)
            try {
              await this.page.evaluate((url, err) => {
                console.log(`[DESKTOP_CONNECTOR] Frame ${url} check failed: ${err}`);
              }, safeFrameUrl, errorMsg);
            } catch {
              // Page also unavailable, just log locally
            }
            logger.debug({ error: frameError, frameUrl: safeFrameUrl }, 'Frame check failed, trying next');
          }
          continue;
        }
      }

      // If no frame found with data, throw error
      throw new Error('No plugin UI found with variables data. Make sure the Variables Exporter (Persistent) plugin is running.');
    } catch (error) {
      logger.error({ error }, 'Failed to get variables from plugin UI');

      await this.page.evaluate((msg) => {
        console.error('[DESKTOP_CONNECTOR] ❌ getVariablesFromPluginUI failed:', msg);
      }, error instanceof Error ? error.message : String(error));

      throw error;
    }
  }

  /**
   * Get component data by node ID from plugin UI window object
   * This bypasses the REST API bug where descriptions are missing
   * by accessing data from the Desktop Bridge plugin via its UI iframe
   */
  async getComponentFromPluginUI(nodeId: string): Promise<any> {
    try {
      // Log to browser console
      await this.page.evaluate((id) => {
        console.log(`[DESKTOP_CONNECTOR] 🎯 getComponentFromPluginUI() called, nodeId: ${id}`);
      }, nodeId);

      logger.info({ nodeId }, 'Getting component from plugin UI iframe');

      // Get all frames (iframes) in the page
      const frames = this.page.frames();

      await this.page.evaluate((count) => {
        console.log(`[DESKTOP_CONNECTOR] Found ${count} frames (iframes)`);
      }, frames.length);

      logger.info({ frameCount: frames.length }, 'Found frames in page');

      // Try to find plugin UI iframe with requestComponentData function
      for (const frame of frames) {
        try {
          // Check if frame is still attached before accessing it
          if (frame.isDetached()) {
            logger.debug('Skipping detached frame');
            continue;
          }

          const frameUrl = frame.url();

          await this.page.evaluate((url) => {
            console.log(`[DESKTOP_CONNECTOR] Checking frame: ${url}`);
          }, frameUrl);

          // Check if this frame has our requestComponentData function
          const hasFunction = await frame.evaluate('typeof window.requestComponentData === "function"');

          await this.page.evaluate((url, has) => {
            console.log(`[DESKTOP_CONNECTOR] Frame ${url} has requestComponentData: ${has}`);
          }, frameUrl, hasFunction);

          if (hasFunction) {
            logger.info({ frameUrl }, 'Found frame with requestComponentData function');

            await this.page.evaluate((url) => {
              console.log(`[DESKTOP_CONNECTOR] ✅ SUCCESS! Found plugin UI with requestComponentData: ${url}`);
            }, frameUrl);

            // Call the function with the nodeId - it returns a Promise
            // Use JSON.stringify to safely pass the nodeId as a string literal
            const result = await frame.evaluate(`window.requestComponentData(${JSON.stringify(nodeId)})`) as any;

            logger.info(
              {
                nodeId,
                componentName: result.component?.name,
                hasDescription: !!result.component?.description
              },
              'Successfully retrieved component from plugin UI'
            );

            await this.page.evaluate((name, hasDesc) => {
              console.log(`[DESKTOP_CONNECTOR] ✅ Retrieved component "${name}", has description: ${hasDesc}`);
            }, result.component?.name, !!result.component?.description);

            return result;
          }
        } catch (frameError) {
          const errorMsg = frameError instanceof Error ? frameError.message : String(frameError);
          const isDetachedError = errorMsg.includes('detached') || errorMsg.includes('Execution context was destroyed');

          // Safely get frame URL (may fail if frame is detached)
          let safeFrameUrl = 'unknown';
          try {
            safeFrameUrl = frame.url();
          } catch {
            safeFrameUrl = '(detached)';
          }

          if (isDetachedError) {
            logger.debug({ frameUrl: safeFrameUrl }, 'Frame was detached during component check, trying next');
          } else {
            // Only log to browser console if we can (page may still be accessible)
            try {
              await this.page.evaluate((url, err) => {
                console.log(`[DESKTOP_CONNECTOR] Frame ${url} check failed: ${err}`);
              }, safeFrameUrl, errorMsg);
            } catch {
              // Page also unavailable, just log locally
            }
            logger.debug({ error: frameError, frameUrl: safeFrameUrl }, 'Frame check failed, trying next');
          }
          continue;
        }
      }

      // If no frame found with function, throw error
      throw new Error('No plugin UI found with requestComponentData function. Make sure the Desktop Bridge plugin is running.');
    } catch (error) {
      logger.error({ error, nodeId }, 'Failed to get component from plugin UI');

      await this.page.evaluate((msg) => {
        console.error('[DESKTOP_CONNECTOR] ❌ getComponentFromPluginUI failed:', msg);
      }, error instanceof Error ? error.message : String(error));

      throw error;
    }
  }

  /**
   * Get Figma variables using the desktop connection
   * This bypasses the Enterprise requirement!
   */
  async getVariables(fileKey?: string): Promise<any> {
    // Log to browser console
    await this.page.evaluate((key) => {
      console.log(`[DESKTOP_CONNECTOR] 🚀 getVariables() called, fileKey: ${key}`);
    }, fileKey);

    logger.info({ fileKey }, 'Getting variables via Desktop connection');

    const code = `
      (async () => {
        try {
          // Check if we're in the right context
          if (typeof figma === 'undefined') {
            throw new Error('Figma API not available in this context');
          }

          // Get variables just like the official MCP does
          const variables = await figma.variables.getLocalVariablesAsync();
          const collections = await figma.variables.getLocalVariableCollectionsAsync();

          // Format the response with file metadata for context verification
          const result = {
            success: true,
            timestamp: Date.now(),
            // Include file metadata so we can verify we're querying the right file
            fileMetadata: {
              fileName: figma.root.name,
              fileKey: figma.fileKey || null
            },
            variables: variables.map(v => ({
              id: v.id,
              name: v.name,
              key: v.key,
              resolvedType: v.resolvedType,
              valuesByMode: v.valuesByMode,
              variableCollectionId: v.variableCollectionId,
              scopes: v.scopes,
              description: v.description,
              hiddenFromPublishing: v.hiddenFromPublishing
            })),
            variableCollections: collections.map(c => ({
              id: c.id,
              name: c.name,
              key: c.key,
              modes: c.modes,
              defaultModeId: c.defaultModeId,
              variableIds: c.variableIds
            }))
          };

          return result;
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      })()
    `;

    try {
      const result = await this.executeInPluginContext(code);

      if (!result.success) {
        throw new Error(result.error || 'Failed to get variables');
      }

      logger.info(
        {
          variableCount: result.variables?.length,
          collectionCount: result.variableCollections?.length
        },
        'Successfully retrieved variables via Desktop'
      );

      return result;
    } catch (error) {
      logger.error({ error }, 'Failed to get variables via Desktop');
      throw error;
    }
  }

  /**
   * Clean up resources (no-op since we use Puppeteer's built-in worker management)
   */

  /**
   * Get component data by node ID using Plugin API
   * This bypasses the REST API bug where descriptions are missing
   */
  async getComponentByNodeId(nodeId: string): Promise<any> {
    await this.page.evaluate((id) => {
      console.log(`[DESKTOP_CONNECTOR] 🎯 getComponentByNodeId() called, nodeId: ${id}`);
    }, nodeId);

    logger.info({ nodeId }, 'Getting component via Desktop Plugin API');

    const code = `
      (async () => {
        try {
          // Check if we're in the right context
          if (typeof figma === 'undefined') {
            throw new Error('Figma API not available in this context');
          }

          // Get the node by ID
          const node = figma.getNodeById('${nodeId}');
          
          if (!node) {
            throw new Error('Node not found with ID: ${nodeId}');
          }

          // Check if it's a component-like node
          if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET' && node.type !== 'INSTANCE') {
            throw new Error('Node is not a component, component set, or instance. Type: ' + node.type);
          }

          // Detect if this is a variant (COMPONENT inside a COMPONENT_SET)
          // Note: Can't use optional chaining (?.) - Figma plugin sandbox doesn't support it
          const isVariant = node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET';

          // Extract component data including description fields
          const result = {
            success: true,
            timestamp: Date.now(),
            component: {
              id: node.id,
              name: node.name,
              type: node.type,
              // Variants CAN have their own description
              description: node.description || null,
              descriptionMarkdown: node.descriptionMarkdown || null,
              // Include other useful properties
              visible: node.visible,
              locked: node.locked,
              // Flag to indicate if this is a variant
              isVariant: isVariant,
              // For component sets and non-variant components only (variants cannot access this)
              componentPropertyDefinitions: node.type === 'COMPONENT_SET' || (node.type === 'COMPONENT' && !isVariant)
                ? node.componentPropertyDefinitions
                : undefined,
              // Get children info (lightweight)
              children: node.children ? node.children.map(child => ({
                id: child.id,
                name: child.name,
                type: child.type
              })) : undefined
            }
          };

          return result;
        } catch (error) {
          return {
            success: false,
            error: error.message,
            stack: error.stack
          };
        }
      })()
    `;

    try {
      const result = await this.executeInPluginContext(code);

      if (!result.success) {
        throw new Error(result.error || 'Failed to get component data');
      }

      logger.info(
        {
          nodeId,
          componentName: result.component?.name,
          hasDescription: !!result.component?.description
        },
        'Successfully retrieved component via Desktop Plugin API'
      );

      await this.page.evaluate((name, hasDesc) => {
        console.log(`[DESKTOP_CONNECTOR] ✅ Retrieved component "${name}", has description: ${hasDesc}`);
      }, result.component?.name, !!result.component?.description);

      return result;
    } catch (error) {
      logger.error({ error, nodeId }, 'Failed to get component via Desktop Plugin API');
      
      await this.page.evaluate((id, err) => {
        console.error(`[DESKTOP_CONNECTOR] ❌ getComponentByNodeId failed for ${id}:`, err);
      }, nodeId, error instanceof Error ? error.message : String(error));
      
      throw error;
    }
  }


  async dispose(): Promise<void> {
    logger.info('Figma Desktop connector disposed');
  }

  // ============================================================================
  // WRITE OPERATIONS - Execute commands via Plugin UI iframe
  // ============================================================================

  /**
   * Find the Desktop Bridge plugin UI iframe
   * Returns the frame that has the write operation functions
   * Handles detached frame errors gracefully
   */
  private async findPluginUIFrame(): Promise<any> {
    // Get fresh frames - don't cache this
    const frames = this.page.frames();

    logger.debug({ frameCount: frames.length }, 'Searching for Desktop Bridge plugin UI frame');

    for (const frame of frames) {
      try {
        // Skip detached frames
        if (frame.isDetached()) {
          continue;
        }

        // Check if this frame has the executeCode function (our Desktop Bridge plugin)
        const hasWriteOps = await frame.evaluate('typeof window.executeCode === "function"');

        if (hasWriteOps) {
          logger.info({ frameUrl: frame.url() }, 'Found Desktop Bridge plugin UI frame');
          return frame;
        }
      } catch (error) {
        // Frame might be inaccessible or detached, continue to next
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('detached')) {
          logger.debug({ frameUrl: frame.url() }, 'Frame was detached, skipping');
        }
        continue;
      }
    }

    throw new Error(
      'Desktop Bridge plugin UI not found. Make sure the Desktop Bridge plugin is running in Figma. ' +
      'The plugin must be open for write operations to work.'
    );
  }

  /**
   * Execute arbitrary code in Figma's plugin context
   * This is the power tool that can run any Figma Plugin API code
   * Includes retry logic for detached frame errors
   */
  async executeCodeViaUI(code: string, timeout: number = 5000): Promise<any> {
    // Log to console (but don't fail if page is stale - this is just for debugging)
    try {
      await this.page.evaluate((codeStr, timeoutMs) => {
        console.log(`[DESKTOP_CONNECTOR] executeCodeViaUI() called, code length: ${codeStr.length}, timeout: ${timeoutMs}ms`);
      }, code, timeout);
    } catch (logError) {
      // If even page logging fails, the page is likely stale
      const errorMsg = logError instanceof Error ? logError.message : String(logError);
      if (errorMsg.includes('detached')) {
        throw new Error(`Page or frame is detached. Please refresh the Figma page or reconnect. Original error: ${errorMsg}`);
      }
      // For other errors, just continue - logging is not critical
      logger.warn({ error: errorMsg }, 'Failed to log to page console');
    }

    logger.info({ codeLength: code.length, timeout }, 'Executing code via plugin UI');

    // Retry logic for detached frame errors
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const frame = await this.findPluginUIFrame();

        // Check if frame is still valid before using it
        if (frame.isDetached()) {
          throw new Error('Frame became detached');
        }

        // Call the executeCode function in the UI iframe
        const result = await frame.evaluate(
          `window.executeCode(${JSON.stringify(code)}, ${timeout})`
        );

        logger.info({ success: result.success, error: result.error }, 'Code execution completed');

        await this.page.evaluate((success: boolean, errorMsg: string) => {
          if (success) {
            console.log('[DESKTOP_CONNECTOR] ✅ Code execution succeeded');
          } else {
            console.log('[DESKTOP_CONNECTOR] ⚠️ Code execution returned error:', errorMsg);
          }
        }, result.success, result.error || '');

        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        lastError = error instanceof Error ? error : new Error(errorMsg);

        // Check if it's a detached frame error
        if (errorMsg.includes('detached') && attempt < maxRetries) {
          logger.warn({ attempt, maxRetries }, 'Frame detached, retrying with fresh frames');
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        // Not a detached frame error or we've exhausted retries
        logger.error({ error: errorMsg, attempt }, 'Code execution failed');

        try {
          await this.page.evaluate((err: string) => {
            console.error('[DESKTOP_CONNECTOR] ❌ executeCodeViaUI failed:', err);
          }, errorMsg);
        } catch {
          // Ignore errors from logging
        }

        throw lastError;
      }
    }

    throw lastError || new Error('Execution failed after retries');
  }

  /**
   * Update a variable's value in a specific mode
   */
  async updateVariable(variableId: string, modeId: string, value: any): Promise<any> {
    await this.page.evaluate((vId, mId) => {
      console.log(`[DESKTOP_CONNECTOR] updateVariable() called: ${vId} mode ${mId}`);
    }, variableId, modeId);

    logger.info({ variableId, modeId }, 'Updating variable via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.updateVariable(${JSON.stringify(variableId)}, ${JSON.stringify(modeId)}, ${JSON.stringify(value)})`
      );

      logger.info({ success: result.success, variableName: result.variable?.name }, 'Variable updated');

      await this.page.evaluate((name: string) => {
        console.log(`[DESKTOP_CONNECTOR] ✅ Variable "${name}" updated successfully`);
      }, result.variable?.name || variableId);

      return result;
    } catch (error) {
      logger.error({ error, variableId }, 'Update variable failed');
      throw error;
    }
  }

  /**
   * Create a new variable in a collection
   */
  async createVariable(
    name: string,
    collectionId: string,
    resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN',
    options?: {
      valuesByMode?: Record<string, any>;
      description?: string;
      scopes?: string[];
    }
  ): Promise<any> {
    await this.page.evaluate((n, cId, type) => {
      console.log(`[DESKTOP_CONNECTOR] createVariable() called: "${n}" in collection ${cId}, type: ${type}`);
    }, name, collectionId, resolvedType);

    logger.info({ name, collectionId, resolvedType }, 'Creating variable via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.createVariable(${JSON.stringify(name)}, ${JSON.stringify(collectionId)}, ${JSON.stringify(resolvedType)}, ${JSON.stringify(options || {})})`
      );

      logger.info({ success: result.success, variableId: result.variable?.id }, 'Variable created');

      await this.page.evaluate((id: string, n: string) => {
        console.log(`[DESKTOP_CONNECTOR] ✅ Variable "${n}" created with ID: ${id}`);
      }, result.variable?.id || 'unknown', name);

      return result;
    } catch (error) {
      logger.error({ error, name }, 'Create variable failed');
      throw error;
    }
  }

  /**
   * Create a new variable collection
   */
  async createVariableCollection(
    name: string,
    options?: {
      initialModeName?: string;
      additionalModes?: string[];
    }
  ): Promise<any> {
    await this.page.evaluate((n) => {
      console.log(`[DESKTOP_CONNECTOR] createVariableCollection() called: "${n}"`);
    }, name);

    logger.info({ name, options }, 'Creating variable collection via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.createVariableCollection(${JSON.stringify(name)}, ${JSON.stringify(options || {})})`
      );

      logger.info({ success: result.success, collectionId: result.collection?.id }, 'Collection created');

      await this.page.evaluate((id: string, n: string) => {
        console.log(`[DESKTOP_CONNECTOR] ✅ Collection "${n}" created with ID: ${id}`);
      }, result.collection?.id || 'unknown', name);

      return result;
    } catch (error) {
      logger.error({ error, name }, 'Create collection failed');
      throw error;
    }
  }

  /**
   * Delete a variable
   */
  async deleteVariable(variableId: string): Promise<any> {
    await this.page.evaluate((vId) => {
      console.log(`[DESKTOP_CONNECTOR] deleteVariable() called: ${vId}`);
    }, variableId);

    logger.info({ variableId }, 'Deleting variable via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.deleteVariable(${JSON.stringify(variableId)})`
      );

      logger.info({ success: result.success, deletedName: result.deleted?.name }, 'Variable deleted');

      await this.page.evaluate((name: string) => {
        console.log(`[DESKTOP_CONNECTOR] ✅ Variable "${name}" deleted`);
      }, result.deleted?.name || variableId);

      return result;
    } catch (error) {
      logger.error({ error, variableId }, 'Delete variable failed');
      throw error;
    }
  }

  /**
   * Delete a variable collection
   */
  async deleteVariableCollection(collectionId: string): Promise<any> {
    await this.page.evaluate((cId) => {
      console.log(`[DESKTOP_CONNECTOR] deleteVariableCollection() called: ${cId}`);
    }, collectionId);

    logger.info({ collectionId }, 'Deleting collection via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.deleteVariableCollection(${JSON.stringify(collectionId)})`
      );

      logger.info({ success: result.success, deletedName: result.deleted?.name }, 'Collection deleted');

      await this.page.evaluate((name: string, count: number) => {
        console.log(`[DESKTOP_CONNECTOR] ✅ Collection "${name}" deleted (had ${count} variables)`);
      }, result.deleted?.name || collectionId, result.deleted?.variableCount || 0);

      return result;
    } catch (error) {
      logger.error({ error, collectionId }, 'Delete collection failed');
      throw error;
    }
  }

  /**
   * Refresh variables data from Figma
   */
  async refreshVariables(): Promise<any> {
    await this.page.evaluate(() => {
      console.log('[DESKTOP_CONNECTOR] refreshVariables() called');
    });

    logger.info('Refreshing variables via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate('window.refreshVariables()');

      logger.info(
        {
          success: result.success,
          variableCount: result.data?.variables?.length,
          collectionCount: result.data?.variableCollections?.length
        },
        'Variables refreshed'
      );

      await this.page.evaluate((vCount: number, cCount: number) => {
        console.log(`[DESKTOP_CONNECTOR] ✅ Variables refreshed: ${vCount} variables in ${cCount} collections`);
      }, result.data?.variables?.length || 0, result.data?.variableCollections?.length || 0);

      return result;
    } catch (error) {
      logger.error({ error }, 'Refresh variables failed');
      throw error;
    }
  }

  /**
   * Rename a variable
   */
  async renameVariable(variableId: string, newName: string): Promise<any> {
    await this.page.evaluate((vId, name) => {
      console.log(`[DESKTOP_CONNECTOR] renameVariable() called: ${vId} -> "${name}"`);
    }, variableId, newName);

    logger.info({ variableId, newName }, 'Renaming variable via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.renameVariable(${JSON.stringify(variableId)}, ${JSON.stringify(newName)})`
      );

      logger.info({ success: result.success, oldName: result.oldName, newName: result.variable?.name }, 'Variable renamed');

      await this.page.evaluate((oldN: string, newN: string) => {
        console.log(`[DESKTOP_CONNECTOR] ✅ Variable renamed from "${oldN}" to "${newN}"`);
      }, result.oldName || 'unknown', result.variable?.name || newName);

      return result;
    } catch (error) {
      logger.error({ error, variableId }, 'Rename variable failed');
      throw error;
    }
  }

  /**
   * Add a mode to a variable collection
   */
  async addMode(collectionId: string, modeName: string): Promise<any> {
    await this.page.evaluate((cId, name) => {
      console.log(`[DESKTOP_CONNECTOR] addMode() called: "${name}" to collection ${cId}`);
    }, collectionId, modeName);

    logger.info({ collectionId, modeName }, 'Adding mode via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.addMode(${JSON.stringify(collectionId)}, ${JSON.stringify(modeName)})`
      );

      logger.info({ success: result.success, newModeId: result.newMode?.modeId }, 'Mode added');

      await this.page.evaluate((name: string, modeId: string) => {
        console.log(`[DESKTOP_CONNECTOR] ✅ Mode "${name}" added with ID: ${modeId}`);
      }, modeName, result.newMode?.modeId || 'unknown');

      return result;
    } catch (error) {
      logger.error({ error, collectionId }, 'Add mode failed');
      throw error;
    }
  }

  /**
   * Rename a mode in a variable collection
   */
  async renameMode(collectionId: string, modeId: string, newName: string): Promise<any> {
    await this.page.evaluate((cId, mId, name) => {
      console.log(`[DESKTOP_CONNECTOR] renameMode() called: mode ${mId} in collection ${cId} -> "${name}"`);
    }, collectionId, modeId, newName);

    logger.info({ collectionId, modeId, newName }, 'Renaming mode via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.renameMode(${JSON.stringify(collectionId)}, ${JSON.stringify(modeId)}, ${JSON.stringify(newName)})`
      );

      logger.info({ success: result.success, oldName: result.oldName, newName }, 'Mode renamed');

      await this.page.evaluate((oldN: string, newN: string) => {
        console.log(`[DESKTOP_CONNECTOR] ✅ Mode renamed from "${oldN}" to "${newN}"`);
      }, result.oldName || 'unknown', newName);

      return result;
    } catch (error) {
      logger.error({ error, collectionId, modeId }, 'Rename mode failed');
      throw error;
    }
  }

  /**
   * Get all local components for design system manifest generation
   */
  async getLocalComponents(): Promise<{
    success: boolean;
    data?: {
      components: any[];
      componentSets: any[];
      totalComponents: number;
      totalComponentSets: number;
      fileKey: string;
      timestamp: number;
    };
    error?: string;
  }> {
    await this.page.evaluate(() => {
      console.log('[DESKTOP_CONNECTOR] getLocalComponents() called');
    });

    logger.info('Getting local components via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate('window.getLocalComponents()');

      logger.info(
        {
          success: result.success,
          componentCount: result.data?.totalComponents,
          componentSetCount: result.data?.totalComponentSets
        },
        'Local components retrieved'
      );

      await this.page.evaluate((cCount: number, csCount: number) => {
        console.log(`[DESKTOP_CONNECTOR] ✅ Found ${cCount} components and ${csCount} component sets`);
      }, result.data?.totalComponents || 0, result.data?.totalComponentSets || 0);

      return result;
    } catch (error) {
      logger.error({ error }, 'Get local components failed');
      throw error;
    }
  }

  /**
   * Instantiate a component with overrides
   * Supports both published library components (by key) and local components (by nodeId)
   */
  async instantiateComponent(
    componentKey: string,
    options?: {
      nodeId?: string;  // For local (unpublished) components
      position?: { x: number; y: number };
      size?: { width: number; height: number };
      overrides?: Record<string, any>;
      variant?: Record<string, string>;
      parentId?: string;
    }
  ): Promise<{
    success: boolean;
    instance?: {
      id: string;
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
    };
    error?: string;
  }> {
    await this.page.evaluate((key, nodeId) => {
      console.log(`[DESKTOP_CONNECTOR] instantiateComponent() called: key=${key}, nodeId=${nodeId}`);
    }, componentKey, options?.nodeId || null);

    logger.info({ componentKey, nodeId: options?.nodeId, options }, 'Instantiating component via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.instantiateComponent(${JSON.stringify(componentKey)}, ${JSON.stringify(options || {})})`
      );

      logger.info({ success: result.success, instanceId: result.instance?.id }, 'Component instantiated');

      await this.page.evaluate((instanceId: string, name: string) => {
        console.log(`[DESKTOP_CONNECTOR] ✅ Component instantiated: ${name} (${instanceId})`);
      }, result.instance?.id || 'unknown', result.instance?.name || 'unknown');

      return result;
    } catch (error) {
      logger.error({ error, componentKey }, 'Instantiate component failed');
      throw error;
    }
  }

  // ============================================================================
  // NEW: COMPONENT PROPERTY MANAGEMENT
  // ============================================================================

  /**
   * Set description on a component or style
   */
  async setNodeDescription(nodeId: string, description: string, descriptionMarkdown?: string): Promise<any> {
    logger.info({ nodeId, descriptionLength: description.length }, 'Setting node description via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.setNodeDescription(${JSON.stringify(nodeId)}, ${JSON.stringify(description)}, ${JSON.stringify(descriptionMarkdown)})`
      );

      logger.info({ success: result.success, nodeName: result.node?.name }, 'Description set');
      return result;
    } catch (error) {
      logger.error({ error, nodeId }, 'Set description failed');
      throw error;
    }
  }

  /**
   * Add a component property
   */
  async addComponentProperty(
    nodeId: string,
    propertyName: string,
    type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT',
    defaultValue: any,
    options?: { preferredValues?: any[] }
  ): Promise<any> {
    logger.info({ nodeId, propertyName, type }, 'Adding component property via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.addComponentProperty(${JSON.stringify(nodeId)}, ${JSON.stringify(propertyName)}, ${JSON.stringify(type)}, ${JSON.stringify(defaultValue)}, ${JSON.stringify(options || {})})`
      );

      logger.info({ success: result.success, propertyName: result.propertyName }, 'Property added');
      return result;
    } catch (error) {
      logger.error({ error, nodeId, propertyName }, 'Add component property failed');
      throw error;
    }
  }

  /**
   * Edit an existing component property
   */
  async editComponentProperty(
    nodeId: string,
    propertyName: string,
    newValue: { name?: string; defaultValue?: any; preferredValues?: any[] }
  ): Promise<any> {
    logger.info({ nodeId, propertyName }, 'Editing component property via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.editComponentProperty(${JSON.stringify(nodeId)}, ${JSON.stringify(propertyName)}, ${JSON.stringify(newValue)})`
      );

      logger.info({ success: result.success, propertyName: result.propertyName }, 'Property edited');
      return result;
    } catch (error) {
      logger.error({ error, nodeId, propertyName }, 'Edit component property failed');
      throw error;
    }
  }

  /**
   * Delete a component property
   */
  async deleteComponentProperty(nodeId: string, propertyName: string): Promise<any> {
    logger.info({ nodeId, propertyName }, 'Deleting component property via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.deleteComponentProperty(${JSON.stringify(nodeId)}, ${JSON.stringify(propertyName)})`
      );

      logger.info({ success: result.success }, 'Property deleted');
      return result;
    } catch (error) {
      logger.error({ error, nodeId, propertyName }, 'Delete component property failed');
      throw error;
    }
  }

  // ============================================================================
  // NEW: NODE MANIPULATION
  // ============================================================================

  /**
   * Resize a node
   */
  async resizeNode(nodeId: string, width: number, height: number, withConstraints: boolean = true): Promise<any> {
    logger.info({ nodeId, width, height, withConstraints }, 'Resizing node via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.resizeNode(${JSON.stringify(nodeId)}, ${width}, ${height}, ${withConstraints})`
      );

      logger.info({ success: result.success, nodeId: result.node?.id }, 'Node resized');
      return result;
    } catch (error) {
      logger.error({ error, nodeId }, 'Resize node failed');
      throw error;
    }
  }

  /**
   * Move/position a node
   */
  async moveNode(nodeId: string, x: number, y: number): Promise<any> {
    logger.info({ nodeId, x, y }, 'Moving node via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.moveNode(${JSON.stringify(nodeId)}, ${x}, ${y})`
      );

      logger.info({ success: result.success, nodeId: result.node?.id }, 'Node moved');
      return result;
    } catch (error) {
      logger.error({ error, nodeId }, 'Move node failed');
      throw error;
    }
  }

  /**
   * Set fills (colors) on a node
   */
  async setNodeFills(nodeId: string, fills: any[]): Promise<any> {
    logger.info({ nodeId, fillCount: fills.length }, 'Setting node fills via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.setNodeFills(${JSON.stringify(nodeId)}, ${JSON.stringify(fills)})`
      );

      logger.info({ success: result.success, nodeId: result.node?.id }, 'Fills set');
      return result;
    } catch (error) {
      logger.error({ error, nodeId }, 'Set fills failed');
      throw error;
    }
  }

  /**
   * Set strokes on a node
   */
  async setNodeStrokes(nodeId: string, strokes: any[], strokeWeight?: number): Promise<any> {
    logger.info({ nodeId, strokeCount: strokes.length, strokeWeight }, 'Setting node strokes via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.setNodeStrokes(${JSON.stringify(nodeId)}, ${JSON.stringify(strokes)}, ${strokeWeight})`
      );

      logger.info({ success: result.success, nodeId: result.node?.id }, 'Strokes set');
      return result;
    } catch (error) {
      logger.error({ error, nodeId }, 'Set strokes failed');
      throw error;
    }
  }

  /**
   * Set opacity on a node
   */
  async setNodeOpacity(nodeId: string, opacity: number): Promise<any> {
    logger.info({ nodeId, opacity }, 'Setting node opacity via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.setNodeOpacity(${JSON.stringify(nodeId)}, ${opacity})`
      );

      logger.info({ success: result.success, opacity: result.node?.opacity }, 'Opacity set');
      return result;
    } catch (error) {
      logger.error({ error, nodeId }, 'Set opacity failed');
      throw error;
    }
  }

  /**
   * Set corner radius on a node
   */
  async setNodeCornerRadius(nodeId: string, radius: number): Promise<any> {
    logger.info({ nodeId, radius }, 'Setting node corner radius via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.setNodeCornerRadius(${JSON.stringify(nodeId)}, ${radius})`
      );

      logger.info({ success: result.success, radius: result.node?.cornerRadius }, 'Corner radius set');
      return result;
    } catch (error) {
      logger.error({ error, nodeId }, 'Set corner radius failed');
      throw error;
    }
  }

  /**
   * Clone/duplicate a node
   */
  async cloneNode(nodeId: string): Promise<any> {
    logger.info({ nodeId }, 'Cloning node via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.cloneNode(${JSON.stringify(nodeId)})`
      );

      logger.info({ success: result.success, clonedId: result.node?.id }, 'Node cloned');
      return result;
    } catch (error) {
      logger.error({ error, nodeId }, 'Clone node failed');
      throw error;
    }
  }

  /**
   * Delete a node
   */
  async deleteNode(nodeId: string): Promise<any> {
    logger.info({ nodeId }, 'Deleting node via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.deleteNode(${JSON.stringify(nodeId)})`
      );

      logger.info({ success: result.success, deletedName: result.deleted?.name }, 'Node deleted');
      return result;
    } catch (error) {
      logger.error({ error, nodeId }, 'Delete node failed');
      throw error;
    }
  }

  /**
   * Rename a node
   */
  async renameNode(nodeId: string, newName: string): Promise<any> {
    logger.info({ nodeId, newName }, 'Renaming node via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.renameNode(${JSON.stringify(nodeId)}, ${JSON.stringify(newName)})`
      );

      logger.info({ success: result.success, oldName: result.node?.oldName, newName: result.node?.name }, 'Node renamed');
      return result;
    } catch (error) {
      logger.error({ error, nodeId }, 'Rename node failed');
      throw error;
    }
  }

  /**
   * Set text content on a text node
   */
  async setTextContent(nodeId: string, text: string, options?: { fontSize?: number }): Promise<any> {
    logger.info({ nodeId, textLength: text.length }, 'Setting text content via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.setTextContent(${JSON.stringify(nodeId)}, ${JSON.stringify(text)}, ${JSON.stringify(options || {})})`
      );

      logger.info({ success: result.success, characters: result.node?.characters?.substring(0, 50) }, 'Text content set');
      return result;
    } catch (error) {
      logger.error({ error, nodeId }, 'Set text content failed');
      throw error;
    }
  }

  /**
   * Create a child node
   */
  async createChildNode(
    parentId: string,
    nodeType: 'RECTANGLE' | 'ELLIPSE' | 'FRAME' | 'TEXT' | 'LINE' | 'POLYGON' | 'STAR' | 'VECTOR',
    properties?: {
      name?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      fills?: any[];
      text?: string;
    }
  ): Promise<any> {
    logger.info({ parentId, nodeType, properties }, 'Creating child node via plugin UI');

    const frame = await this.findPluginUIFrame();

    try {
      const result = await frame.evaluate(
        `window.createChildNode(${JSON.stringify(parentId)}, ${JSON.stringify(nodeType)}, ${JSON.stringify(properties || {})})`
      );

      logger.info({ success: result.success, nodeId: result.node?.id, nodeType: result.node?.type }, 'Child node created');
      return result;
    } catch (error) {
      logger.error({ error, parentId, nodeType }, 'Create child node failed');
      throw error;
    }
  }

  // ============================================================================
  // BATCH VARIABLE OPERATIONS
  // ============================================================================

  /**
   * Create multiple variables in a collection at once
   * Reduces 13 individual creates to 1 batch call
   */
  async batchCreateVariables(params: {
    collectionId: string;
    variables: Array<{
      name: string;
      type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
      valuesByMode: Record<string, any>;
      description?: string;
    }>;
    options?: { atomic?: boolean };
  }): Promise<{
    created: Array<{ name: string; id: string; type: string }>;
    failed: Array<{ name: string; error: string }>;
    duration: number;
  }> {
    logger.info({ collectionId: params.collectionId, variableCount: params.variables.length }, 'Batch creating variables via plugin UI');

    const code = `
      (async () => {
        const results = { created: [], failed: [], duration: 0 };
        const startTime = Date.now();
        const collection = figma.variables.getVariableCollectionById('${params.collectionId}');

        if (!collection) {
          throw new Error('Collection not found: ${params.collectionId}');
        }

        const variables = ${JSON.stringify(params.variables)};

        for (const varSpec of variables) {
          try {
            const variable = figma.variables.createVariable(
              varSpec.name,
              collection,
              varSpec.type
            );

            if (varSpec.description) {
              variable.description = varSpec.description;
            }

            for (const [modeId, value] of Object.entries(varSpec.valuesByMode)) {
              await variable.setValueForMode(modeId, value);
            }

            results.created.push({
              name: varSpec.name,
              id: variable.id,
              type: varSpec.type
            });
          } catch (error) {
            results.failed.push({
              name: varSpec.name,
              error: error.message
            });

            ${params.options?.atomic ? 'throw error;' : ''}
          }
        }

        results.duration = Date.now() - startTime;
        return { success: true, ...results };
      })()
    `;

    try {
      const result = await this.executeCodeViaUI(code, 60000);

      if (!result.success) {
        throw new Error(result.error || 'Failed to batch create variables');
      }

      logger.info(
        {
          created: result.created.length,
          failed: result.failed.length,
          duration: result.duration
        },
        'Batch create variables completed'
      );

      return {
        created: result.created,
        failed: result.failed,
        duration: result.duration
      };
    } catch (error) {
      logger.error({ error }, 'Batch create variables failed');
      throw error;
    }
  }

  /**
   * EXPERIMENTAL: Update multiple variable values across modes in one call
   * Reduces 2431 individual updates to ~50 batch calls
   *
   * Note: This function is experimental and may not work reliably in all cases.
   * It does not affect other variable operations if it fails.
   */
  async batchUpdateVariables(params: {
    updates: Array<{
      variableId: string;
      modeId: string;
      value: any;
    }>;
    options?: { continueOnError?: boolean };
  }): Promise<{
    updated: Array<{ variableId: string; modeId: string; variableName: string }>;
    failed: Array<{ variableId: string; modeId: string; error: string }>;
    duration: number;
  }> {
    logger.info({ updateCount: params.updates.length }, 'Batch updating variables via plugin UI');

    const code = `
      (async () => {
        const results = { updated: [], failed: [], duration: 0 };
        const startTime = Date.now();
        const updates = ${JSON.stringify(params.updates)};

        for (const update of updates) {
          try {
            const variable = figma.variables.getVariableById(update.variableId);

            if (!variable) {
              throw new Error('Variable not found: ' + update.variableId);
            }

            await variable.setValueForMode(update.modeId, update.value);

            results.updated.push({
              variableId: update.variableId,
              modeId: update.modeId,
              variableName: variable.name
            });
          } catch (error) {
            results.failed.push({
              variableId: update.variableId,
              modeId: update.modeId,
              error: error.message
            });

            ${!params.options?.continueOnError ? 'throw error;' : ''}
          }
        }

        results.duration = Date.now() - startTime;
        return { success: true, ...results };
      })()
    `;

    try {
      const result = await this.executeCodeViaUI(code, 120000);

      if (!result.success) {
        throw new Error(result.error || 'Failed to batch update variables');
      }

      logger.info(
        {
          updated: result.updated.length,
          failed: result.failed.length,
          duration: result.duration
        },
        'Batch update variables completed'
      );

      return {
        updated: result.updated,
        failed: result.failed,
        duration: result.duration
      };
    } catch (error) {
      logger.error({ error }, 'Batch update variables failed');
      throw error;
    }
  }

  /**
   * Validate variable sync operations before execution
   * Catches 90% of errors before attempting sync
   */
  async validateVariableSync(params: {
    collectionName: string;
    variables: Array<{
      name: string;
      type: string;
      modes: string[];
      action: 'create' | 'update';
    }>;
  }): Promise<{
    valid: boolean;
    errors: Array<{ variable: string; issue: string; suggestion: string }>;
    warnings: Array<{ variable: string; warning: string }>;
    summary: { willCreate: number; willUpdate: number; conflicts: number };
    collection?: { name: string; id: string; modeCount: number; modes: string[] };
  }> {
    logger.info({ collectionName: params.collectionName, variableCount: params.variables.length }, 'Validating variable sync');

    const code = `
      (async () => {
        const errors = [];
        const warnings = [];
        let willCreate = 0;
        let willUpdate = 0;
        let conflicts = 0;

        const collections = figma.variables.getLocalVariableCollections();
        const collection = collections.find(c => c.name === '${params.collectionName}');

        if (!collection) {
          errors.push({
            variable: 'ALL',
            issue: 'Collection "${params.collectionName}" not found',
            suggestion: 'Check collection name or create it first'
          });
          return {
            success: true,
            valid: false,
            errors,
            warnings,
            summary: { willCreate: 0, willUpdate: 0, conflicts: 0 }
          };
        }

        const existingVars = figma.variables.getLocalVariables()
          .filter(v => v.variableCollectionId === collection.id);
        const existingVarNames = new Set(existingVars.map(v => v.name));
        const existingVarTypes = new Map(existingVars.map(v => [v.name, v.resolvedType]));

        const modeNames = new Set(collection.modes.map(m => m.name));

        const variables = ${JSON.stringify(params.variables)};

        for (const varSpec of variables) {
          if (varSpec.action === 'create' && existingVarNames.has(varSpec.name)) {
            conflicts++;
            errors.push({
              variable: varSpec.name,
              issue: 'Variable already exists but action is "create"',
              suggestion: 'Change action to "update" or use different name'
            });
          }

          if (varSpec.action === 'update' && !existingVarNames.has(varSpec.name)) {
            errors.push({
              variable: varSpec.name,
              issue: 'Variable does not exist but action is "update"',
              suggestion: 'Change action to "create" or check variable name'
            });
          }

          if (varSpec.action === 'update' && existingVarNames.has(varSpec.name)) {
            const existingType = existingVarTypes.get(varSpec.name);
            if (existingType !== varSpec.type) {
              errors.push({
                variable: varSpec.name,
                issue: 'Type mismatch: existing=' + existingType + ', requested=' + varSpec.type,
                suggestion: 'Types must match for updates'
              });
            }
          }

          for (const modeName of varSpec.modes) {
            if (!modeNames.has(modeName)) {
              warnings.push({
                variable: varSpec.name,
                warning: 'Mode "' + modeName + '" does not exist in collection'
              });
            }
          }

          if (varSpec.action === 'create') willCreate++;
          if (varSpec.action === 'update') willUpdate++;
        }

        return {
          success: true,
          valid: errors.length === 0,
          errors,
          warnings,
          summary: { willCreate, willUpdate, conflicts },
          collection: {
            name: collection.name,
            id: collection.id,
            modeCount: collection.modes.length,
            modes: collection.modes.map(m => m.name)
          }
        };
      })()
    `;

    try {
      const result = await this.executeCodeViaUI(code, 30000);

      if (!result.success) {
        throw new Error(result.error || 'Failed to validate variable sync');
      }

      logger.info(
        {
          valid: result.valid,
          errorCount: result.errors.length,
          warningCount: result.warnings.length
        },
        'Variable sync validation completed'
      );

      return {
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        summary: result.summary,
        collection: result.collection
      };
    } catch (error) {
      logger.error({ error }, 'Variable sync validation failed');
      throw error;
    }
  }

  /**
   * Check which variables exist in a collection
   * Enables smart sync (skip unchanged, determine create vs update)
   */
  async checkVariablesExist(params: {
    collectionName: string;
    variableNames: string[];
  }): Promise<{
    existing: Array<{ name: string; id: string; type: string }>;
    missing: string[];
    collection: {
      name: string;
      id: string;
      modeCount: number;
      modes: Array<{ name: string; id: string }>;
    };
  }> {
    logger.info({ collectionName: params.collectionName, variableCount: params.variableNames.length }, 'Checking variables exist');

    const code = `
      (async () => {
        const collections = figma.variables.getLocalVariableCollections();
        const collection = collections.find(c => c.name === '${params.collectionName}');

        if (!collection) {
          throw new Error('Collection "${params.collectionName}" not found');
        }

        const existingVars = figma.variables.getLocalVariables()
          .filter(v => v.variableCollectionId === collection.id);

        const existingMap = new Map(existingVars.map(v => [v.name, v]));
        const existing = [];
        const missing = [];

        const variableNames = ${JSON.stringify(params.variableNames)};

        for (const name of variableNames) {
          const variable = existingMap.get(name);
          if (variable) {
            existing.push({
              name: variable.name,
              id: variable.id,
              type: variable.resolvedType
            });
          } else {
            missing.push(name);
          }
        }

        return {
          success: true,
          existing,
          missing,
          collection: {
            name: collection.name,
            id: collection.id,
            modeCount: collection.modes.length,
            modes: collection.modes.map(m => ({ name: m.name, id: m.modeId }))
          }
        };
      })()
    `;

    try {
      const result = await this.executeCodeViaUI(code, 30000);

      if (!result.success) {
        throw new Error(result.error || 'Failed to check variables exist');
      }

      logger.info(
        {
          existing: result.existing.length,
          missing: result.missing.length
        },
        'Check variables exist completed'
      );

      return {
        existing: result.existing,
        missing: result.missing,
        collection: result.collection
      };
    } catch (error) {
      logger.error({ error }, 'Check variables exist failed');
      throw error;
    }
  }
}