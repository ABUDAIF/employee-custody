import QRCode from 'qrcode'

export class QRGenerator {
  public static async generateDataUrl(operationNo: string): Promise<string> {
    try {
      const qrData = JSON.stringify({
        op: operationNo,
        app: 'EmployeeCustodyApp'
      })

      return await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
        color: {
          dark: '#1E293B',
          light: '#FFFFFF'
        }
      })
    } catch (err) {
      console.error('Failed to generate QR Code:', err)
      throw err
    }
  }

  public static async generateBuffer(operationNo: string): Promise<Buffer> {
    try {
      const qrData = JSON.stringify({
        op: operationNo,
        app: 'EmployeeCustodyApp'
      })

      return await QRCode.toBuffer(qrData, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300
      })
    } catch (err) {
      console.error('Failed to generate QR Code Buffer:', err)
      throw err
    }
  }
}
