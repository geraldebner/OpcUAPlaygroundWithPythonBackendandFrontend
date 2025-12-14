using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;

class FrontendLauncher
{
    [DllImport("kernel32.dll")]
    private static extern IntPtr GetConsoleWindow();

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    private const int SW_HIDE = 0;

    static void Main(string[] args)
    {
        try
        {
            string frontendDir = AppDomain.CurrentDomain.BaseDirectory;
            string nodePath = "node";
            string serverPath = Path.Combine(frontendDir, "server.js");

            Console.WriteLine("Starting VentilTester Frontend...");
            Console.WriteLine($"Frontend directory: {frontendDir}");
            Console.WriteLine($"Server script: {serverPath}");
            Console.WriteLine();

            // Check if server.js exists
            if (!File.Exists(serverPath))
            {
                Console.WriteLine($"Error: server.js not found at {serverPath}");
                Console.WriteLine("Please make sure server.js is in the same directory as this executable.");
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
                return;
            }

            // Check if Node.js is installed
            ProcessStartInfo checkNode = new ProcessStartInfo
            {
                FileName = "node",
                Arguments = "--version",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            try
            {
                using (Process process = Process.Start(checkNode))
                {
                    process.WaitForExit();
                    if (process.ExitCode != 0)
                    {
                        throw new Exception("Node.js not found");
                    }
                }
            }
            catch
            {
                Console.WriteLine("Error: Node.js is not installed or not in PATH");
                Console.WriteLine("Please install Node.js from https://nodejs.org/");
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
                return;
            }

            // Install production dependencies if node_modules doesn't exist
            if (!Directory.Exists(Path.Combine(frontendDir, "node_modules")))
            {
                Console.WriteLine("Installing production dependencies...");
                ProcessStartInfo installDeps = new ProcessStartInfo
                {
                    FileName = "npm",
                    Arguments = "install --production",
                    WorkingDirectory = frontendDir,
                    UseShellExecute = false,
                    CreateNoWindow = false
                };

                using (Process process = Process.Start(installDeps))
                {
                    process.WaitForExit();
                    if (process.ExitCode != 0)
                    {
                        Console.WriteLine("Error: Failed to install dependencies");
                        Console.WriteLine("Press any key to exit...");
                        Console.ReadKey();
                        return;
                    }
                }
            }

            // Start the Node.js server
            Console.WriteLine("Starting Node.js server...");
            Console.WriteLine();
            Console.WriteLine("========================================");
            Console.WriteLine("VentilTester Frontend");
            Console.WriteLine("========================================");
            Console.WriteLine("Server running at: http://localhost:3000");
            Console.WriteLine("Press Ctrl+C to stop the server");
            Console.WriteLine("========================================");
            Console.WriteLine();

            ProcessStartInfo startServer = new ProcessStartInfo
            {
                FileName = "node",
                Arguments = "server.js",
                WorkingDirectory = frontendDir,
                UseShellExecute = false,
                CreateNoWindow = false
            };

            using (Process process = Process.Start(startServer))
            {
                process.WaitForExit();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
        }
    }
}
