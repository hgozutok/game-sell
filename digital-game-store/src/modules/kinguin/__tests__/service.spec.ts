/**
 * KinguinService birim testleri — Kinguin API tamamen mock'lanir (axios.create).
 * Calistirmak icin API anahtari gerekmez: KINGUIN_API_KEY test ortaminda set edilir.
 */
process.env.KINGUIN_API_KEY = "test-api-key"

import axios from "axios"
import KinguinService from "../service"
import {
  KinguinAuthError,
  KinguinInsufficientBalanceError,
  KinguinNotFoundError,
  KinguinRateLimitError,
} from "../types"

jest.mock("axios", () => ({
  __esModule: true,
  default: { create: jest.fn() },
}))

const mockedCreate = axios.create as jest.MockedFunction<typeof axios.create>

/** AxiosError benzeri red objesi */
function axiosError(status: number | undefined, data?: any, headers?: any) {
  return {
    response: status === undefined ? undefined : { status, data, headers },
    message: `Request failed with status ${status ?? "network"}`,
    isAxiosError: true,
  }
}

function makeService(requestImpl: jest.Mock) {
  mockedCreate.mockReturnValue({ request: requestImpl } as any)
  const service = new KinguinService({}, {})
  return service
}

describe("KinguinService", () => {
  let requestMock: jest.Mock

  beforeEach(() => {
    requestMock = jest.fn()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe("listProducts", () => {
    it("sayfalama parametreleriyle urun listesini dondurur ve mapProduct uygular", async () => {
      requestMock.mockResolvedValue({
        data: {
          results: [
            {
              kinguinId: 1234,
              productId: "PROD1",
              name: "Test Game",
              originalName: "Test Game Original",
              platform: "Steam",
              genre: "Action",
              regionId: 1,
              qty: 7,
              price: 12.5,
              images: {
                cover: { url: "https://img/cover.jpg" },
                screenshots: [{ url: "https://img/s1.jpg" }, { url: "" }],
              },
              genres: ["Action", "Adventure"],
            },
          ],
          item_count: 1,
        },
      })
      const service = makeService(requestMock)

      const res = await service.listProducts({ page: 2, limit: 50, platform: "Steam" })

      expect(requestMock).toHaveBeenCalledTimes(1)
      const call = requestMock.mock.calls[0][0]
      expect(call.method).toBe("get")
      expect(call.url).toBe("/v1/products")
      expect(call.params).toMatchObject({ page: 2, limit: 50, platform: "Steam" })

      expect(res.itemCount).toBe(1)
      expect(res.results[0]).toMatchObject({
        kinguinId: "1234",
        name: "Test Game",
        platform: "Steam",
        regionId: 1,
        qty: 7,
        price: 12.5,
      })
      expect(res.results[0].images.cover).toBe("https://img/cover.jpg")
      expect(res.results[0].images.screenshots).toEqual(["https://img/s1.jpg"])
    })

    it("limit 100 ile sinirlanir (MAX_PAGE_SIZE)", async () => {
      requestMock.mockResolvedValue({ data: { results: [], item_count: 0 } })
      const service = makeService(requestMock)

      await service.listProducts({ limit: 999 } as any)

      expect(requestMock.mock.calls[0][0].params.limit).toBe(100)
    })
  })

  describe("getProduct / getBalance", () => {
    it("getProduct tek urunu ceker", async () => {
      requestMock.mockResolvedValue({ data: { kinguinId: 42, name: "X", price: 5 } })
      const service = makeService(requestMock)

      const p = await service.getProduct(42)
      expect(requestMock.mock.calls[0][0].url).toBe("/v1/products/42")
      expect(p.kinguinId).toBe("42")
    })

    it("getBalance bakiyeyi sayisal dondurur", async () => {
      requestMock.mockResolvedValue({ data: { balance: "123.45" } })
      const service = makeService(requestMock)

      const b = await service.getBalance()
      expect(b).toEqual({ balance: 123.45, currency: "eur" })
    })
  })

  describe("hata siniflandirma", () => {
    it("401 -> KinguinAuthError, retry edilmez", async () => {
      requestMock.mockRejectedValue(axiosError(401, { detail: "bad key" }))
      const service = makeService(requestMock)

      await expect(service.getBalance()).rejects.toBeInstanceOf(KinguinAuthError)
      expect(requestMock).toHaveBeenCalledTimes(1)
    })

    it("404 -> KinguinNotFoundError", async () => {
      requestMock.mockRejectedValue(axiosError(404, { detail: "product" }))
      const service = makeService(requestMock)

      await expect(service.getProduct(1)).rejects.toBeInstanceOf(KinguinNotFoundError)
    })

    it("InsufficientBalance kind -> KinguinInsufficientBalanceError", async () => {
      requestMock.mockRejectedValue(
        axiosError(400, { kind: "InsufficientBalance", detail: "not enough" })
      )
      const service = makeService(requestMock)

      await expect(service.getBalance()).rejects.toBeInstanceOf(
        KinguinInsufficientBalanceError
      )
    })
  })

  describe("retry (exponential backoff)", () => {
    it("429 sonrasi basari: 3 deneme + 2 bekleme (1000ms, 2000ms)", async () => {
      requestMock
        .mockRejectedValueOnce(axiosError(429, {}, { "retry-after": "0" }))
        .mockRejectedValueOnce(axiosError(429, {}, {}))
        .mockResolvedValueOnce({ data: { balance: 10 } })
      const service = makeService(requestMock)

      const promise = service.getBalance()
      // iki retry beklemesini hizlandir
      await jest.advanceTimersByTimeAsync(1000)
      await jest.advanceTimersByTimeAsync(2000)
      const balance = await promise

      expect(balance.balance).toBe(10)
      expect(requestMock).toHaveBeenCalledTimes(3)
    })

    it("Retry-After basligi varsa o sure beklenir", async () => {
      requestMock
        .mockRejectedValueOnce(axiosError(429, {}, { "retry-after": "3" }))
        .mockResolvedValueOnce({ data: { balance: 1 } })
      const service = makeService(requestMock)

      const promise = service.getBalance()
      await jest.advanceTimersByTimeAsync(3000)
      await promise

      expect(requestMock).toHaveBeenCalledTimes(2)
    })

    it("retry tukenince son hata firlatilir", async () => {
      requestMock.mockRejectedValue(axiosError(429, {}, {}))
      const service = makeService(requestMock)

      const promise = service.getBalance()
      promise.catch(() => undefined) // unhandled rejection onlemi
      await jest.runAllTimersAsync()
      await expect(promise).rejects.toBeInstanceOf(KinguinRateLimitError)
      expect(requestMock).toHaveBeenCalledTimes(4) // 1 + 3 retry
    })

    it("5xx retry edilir, 4xx (401) edilmez", async () => {
      requestMock.mockRejectedValue(axiosError(500, { detail: "boom" }))
      const service = makeService(requestMock)

      const promise = service.getBalance()
      promise.catch(() => undefined)
      await jest.runAllTimersAsync()
      await expect(promise).rejects.toThrow(/boom/)
      expect(requestMock).toHaveBeenCalledTimes(4)
    })
  })
})
