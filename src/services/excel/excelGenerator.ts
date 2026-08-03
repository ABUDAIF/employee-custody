import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs'
import { getPermanentStorageDir } from '../db/prismaClient'

export class ExcelGenerator {
  /**
   * Generates a comprehensive multi-sheet Excel report:
   * - Sheet 1: Employee Summary Table AT THE TOP + Master Transactions Table DIRECTLY UNDERNEATH.
   * - Individual Sheets: Dedicated worksheet named after each employee containing their full itemized ledger statement.
   */
  public static async generateReport(data: {
    entries: any[]
    employeeSummaries: any[]
    periodTitle: string
    companyName: string
    targetFilePath?: string
  }): Promise<{ filePath: string; fileName: string }> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = data.companyName
    workbook.created = new Date()

    // ---------------------------------------------------------
    // SHEET 1: MASTER SUMMARY + ALL TRANSACTIONS TABLE UNDERNEATH
    // ---------------------------------------------------------
    const summarySheet = workbook.addWorksheet('ملخص عهد الموظفين')
    summarySheet.views = [{ rtl: true }]

    // 1. Header Title Row
    summarySheet.mergeCells('A1:H1')
    const titleCell = summarySheet.getCell('A1')
    titleCell.value = `${data.companyName} — ملخص كشوفات عهد الموظفين (${data.periodTitle})`
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    summarySheet.getRow(1).height = 35

    // 2. Summary Table Headers
    const headersSummary = [
      'اسم الموظف',
      'الوظيفة',
      'رقم الهاتف',
      'إجمالي العهد (ج.م)',
      'إجمالي المصروفات (ج.م)',
      'الرصيد المتبقي (ج.م)',
      'عدد الحركات'
    ]

    const headerRowSummary = summarySheet.addRow(headersSummary)
    headerRowSummary.height = 25
    headerRowSummary.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // 3. Populate Employee Summary Rows
    for (const emp of data.employeeSummaries) {
      const row = summarySheet.addRow([
        emp.name,
        emp.jobTitle,
        emp.phone,
        emp.totalCustody || 0,
        emp.totalExpenses || 0,
        emp.balance || 0,
        emp.transactionCount || 0
      ])

      row.height = 22
      row.getCell(4).numFmt = '#,##0.00'
      row.getCell(5).numFmt = '#,##0.00'
      row.getCell(6).numFmt = '#,##0.00'
      row.getCell(6).font = { bold: true, color: { argb: (emp.balance || 0) > 0 ? 'FF10B981' : 'FF64748B' } }
    }

    // 4. Blank spacing rows
    summarySheet.addRow([])
    summarySheet.addRow([])

    // 5. Section Header Banner for Detailed Transactions Table Underneath
    const masterBannerRow = summarySheet.addRow([`📋 سجل تفاصيل جميع الحركات والقيود المالية لجميع الموظفين (${data.entries.length} حركة)`])
    const currentMaxRow = summarySheet.rowCount
    summarySheet.mergeCells(`A${currentMaxRow}:H${currentMaxRow}`)
    const masterBannerCell = summarySheet.getCell(`A${currentMaxRow}`)
    masterBannerCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } }
    masterBannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
    masterBannerCell.alignment = { horizontal: 'center', vertical: 'middle' }
    summarySheet.getRow(currentMaxRow).height = 30

    // 6. Master Table Headers
    const masterHeaders = [
      'رقم العملية',
      'التاريخ والوقت (ساعة الجهاز)',
      'اسم الموظف',
      'نوع الحركة',
      'الفئة',
      'الوصف',
      'المبلغ (ج.م)',
      'المرفقات'
    ]

    const masterHeaderRow = summarySheet.addRow(masterHeaders)
    masterHeaderRow.height = 24
    masterHeaderRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // 7. Populate All Transactions Rows
    for (const entry of data.entries) {
      const typeLabel = entry.type === 'DEPOSIT' ? 'إيداع عهدة' : entry.type === 'EXPENSE' ? 'مصروف' : 'عهدة افتتاحية'
      const dateStr = new Date(entry.date).toLocaleString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
      const attCount = entry.attachments ? entry.attachments.length : 0

      const row = summarySheet.addRow([
        entry.operationNo,
        dateStr,
        entry.employee ? entry.employee.name : '-',
        typeLabel,
        entry.category || '-',
        entry.description,
        entry.amount,
        attCount > 0 ? `${attCount} ملف` : '-'
      ])

      row.height = 20
      row.getCell(7).numFmt = '#,##0.00'

      if (entry.type === 'DEPOSIT' || entry.type === 'OPENING_BALANCE') {
        row.getCell(4).font = { color: { argb: 'FF10B981' }, bold: true }
        row.getCell(7).font = { color: { argb: 'FF10B981' }, bold: true }
      } else {
        row.getCell(4).font = { color: { argb: 'FFF43F5E' }, bold: true }
        row.getCell(7).font = { color: { argb: 'FFF43F5E' }, bold: true }
      }
    }

    summarySheet.columns.forEach((col) => {
      col.width = 22
    })

    // ---------------------------------------------------------
    // INDIVIDUAL WORKBOOK SHEETS PER EMPLOYEE (ورقة باسم كل موظف)
    // ---------------------------------------------------------
    for (const emp of data.employeeSummaries) {
      // Sheet Tab Name = Employee Name
      const safeSheetName = emp.name.replace(/[*?:/[\]]/g, '').substring(0, 30) || `موظف_${emp.id.substring(0, 4)}`
      const empSheet = workbook.addWorksheet(safeSheetName)
      empSheet.views = [{ rtl: true }]

      // 1. Employee Main Header Title Banner
      empSheet.mergeCells('A1:G1')
      const bannerCell = empSheet.getCell('A1')
      bannerCell.value = `كشف حساب الموظف التفصيلي: ${emp.name} — ${emp.jobTitle} (${emp.phone})`
      bannerCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } }
      bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
      bannerCell.alignment = { horizontal: 'center', vertical: 'middle' }
      empSheet.getRow(1).height = 35

      // 2. Employee Summary KPI Cards Row
      empSheet.addRow([
        `إجمالي العهد: ${(emp.totalCustody || 0).toLocaleString('ar-EG')} ج.م`,
        '',
        `إجمالي المصروفات: ${(emp.totalExpenses || 0).toLocaleString('ar-EG')} ج.م`,
        '',
        `الرصيد المتبقي: ${(emp.balance || 0).toLocaleString('ar-EG')} ج.م`
      ])
      empSheet.getRow(2).height = 24
      empSheet.getRow(2).font = { bold: true, size: 11, color: { argb: 'FF4F46E5' } }

      empSheet.addRow([]) // blank spacing row

      // 3. Employee Detailed Transactions Table Header
      const empHeaders = [
        'رقم العملية',
        'التاريخ والوقت (ساعة الجهاز)',
        'نوع الحركة',
        'الفئة',
        'الوصف',
        'المبلغ (ج.م)',
        'المرفقات'
      ]

      const headerRowEmp = empSheet.addRow(empHeaders)
      headerRowEmp.height = 24
      headerRowEmp.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      })

      // 4. Filter entries for this employee
      const empEntries = data.entries.filter((e) => e.employeeId === emp.id)

      for (const entry of empEntries) {
        const typeLabel = entry.type === 'DEPOSIT' ? 'إيداع عهدة' : entry.type === 'EXPENSE' ? 'مصروف' : 'عهدة افتتاحية'
        const dateStr = new Date(entry.date).toLocaleString('ar-EG', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })

        const attCount = entry.attachments ? entry.attachments.length : 0

        const row = empSheet.addRow([
          entry.operationNo,
          dateStr,
          typeLabel,
          entry.category || '-',
          entry.description,
          entry.amount,
          attCount > 0 ? `${attCount} ملف` : '-'
        ])

        row.height = 20
        row.getCell(6).numFmt = '#,##0.00'

        if (entry.type === 'DEPOSIT' || entry.type === 'OPENING_BALANCE') {
          row.getCell(3).font = { color: { argb: 'FF10B981' }, bold: true }
          row.getCell(6).font = { color: { argb: 'FF10B981' }, bold: true }
        } else {
          row.getCell(3).font = { color: { argb: 'FFF43F5E' }, bold: true }
          row.getCell(6).font = { color: { argb: 'FFF43F5E' }, bold: true }
        }
      }

      empSheet.columns.forEach((col) => {
        col.width = 22
      })
    }

    // Determine Save Path
    let filePath = data.targetFilePath
    if (!filePath) {
      const reportsDir = path.join(getPermanentStorageDir(), 'reports')
      if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
      filePath = path.join(reportsDir, `Report_All_Employees_${Date.now()}.xlsx`)
    }

    const fileName = path.basename(filePath)
    await workbook.xlsx.writeFile(filePath)
    return { filePath, fileName }
  }

  /**
   * Generates a Master System General Report containing complete overview
   */
  public static async generateMasterReport(data: {
    entries: any[]
    employeeSummaries: any[]
    companyName: string
    targetFilePath?: string
  }): Promise<{ filePath: string; fileName: string }> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = data.companyName
    workbook.created = new Date()

    const masterSheet = workbook.addWorksheet('سجل الحركات العام')
    masterSheet.views = [{ rtl: true }]

    masterSheet.mergeCells('A1:H1')
    const titleCell = masterSheet.getCell('A1')
    titleCell.value = `${data.companyName} — التقرير العام الشامل لجميع القيود والمصروفات`
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    masterSheet.getRow(1).height = 35

    const headers = [
      'رقم العملية',
      'التاريخ والوقت',
      'اسم الموظف',
      'الوظيفة',
      'نوع الحركة',
      'الفئة',
      'الوصف',
      'المبلغ (ج.م)'
    ]

    const headerRow = masterSheet.addRow(headers)
    headerRow.height = 25
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    for (const entry of data.entries) {
      const typeLabel = entry.type === 'DEPOSIT' ? 'إيداع عهدة' : entry.type === 'EXPENSE' ? 'مصروف' : 'عهدة افتتاحية'
      const dateStr = new Date(entry.date).toLocaleString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })

      const row = masterSheet.addRow([
        entry.operationNo,
        dateStr,
        entry.employee ? entry.employee.name : '-',
        entry.employee ? entry.employee.jobTitle : '-',
        typeLabel,
        entry.category || '-',
        entry.description,
        entry.amount
      ])

      row.height = 22
      row.getCell(8).numFmt = '#,##0.00'

      if (entry.type === 'DEPOSIT' || entry.type === 'OPENING_BALANCE') {
        row.getCell(5).font = { color: { argb: 'FF10B981' }, bold: true }
        row.getCell(8).font = { color: { argb: 'FF10B981' }, bold: true }
      } else {
        row.getCell(5).font = { color: { argb: 'FFF43F5E' }, bold: true }
        row.getCell(8).font = { color: { argb: 'FFF43F5E' }, bold: true }
      }
    }

    masterSheet.columns.forEach((col) => {
      col.width = 22
    })

    let filePath = data.targetFilePath
    if (!filePath) {
      const reportsDir = path.join(getPermanentStorageDir(), 'reports')
      if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
      filePath = path.join(reportsDir, `Master_Report_${Date.now()}.xlsx`)
    }

    const fileName = path.basename(filePath)
    await workbook.xlsx.writeFile(filePath)
    return { filePath, fileName }
  }
}
