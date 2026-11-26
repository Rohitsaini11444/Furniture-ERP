# Pinkcity Enterprises ERP - Register Daily Scheduled Task
$ErrorActionPreference = "Stop"

$taskName = "Pinkcity_ERP_Automated_Backup"
$pythonExe = "C:\Users\User\Desktop\ERP Furniture\.venv\Scripts\python.exe"
$cliScript = "C:\Users\User\Desktop\ERP Furniture\backup_system\cli.py"
$workDir = "C:\Users\User\Desktop\ERP Furniture"
$arguments = "`"$cliScript`" --run --scheduled"

Write-Host "Configuring Scheduled Task: $taskName"
Write-Host "Target Action: $pythonExe $arguments"
Write-Host "Schedule: Daily at 20:00:00 (8:00 PM IST)"

$action = New-ScheduledTaskAction -Execute $pythonExe -Argument $arguments -WorkingDirectory $workDir
$trigger = New-ScheduledTaskTrigger -Daily -At "20:00:00"

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 15) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -DontStopIfGoingOnBatteries `
    -AllowStartIfOnBatteries

$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Pinkcity Enterprises ERP - Automated End-to-End Encrypted Backup and Restore Verification Daily at 8:00 PM IST" `
    -Force | Out-Null

Write-Host "Task successfully registered!"

$task = Get-ScheduledTask -TaskName $taskName
Write-Host "Task Name: " $task.TaskName
Write-Host "Task State: " $task.State
Write-Host "Description: " $task.Description

$info = Get-ScheduledTaskInfo -TaskName $taskName
Write-Host "Next Run Time: " $info.NextRunTime
Write-Host "Last Run Time: " $info.LastRunTime
Write-Host "Last Result: " $info.LastTaskResult
