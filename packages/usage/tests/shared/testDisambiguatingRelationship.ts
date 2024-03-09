import { createId } from '@paralleldrive/cuid2'
import { inArray } from 'drizzle-orm'
import { throwIfnull } from 'tests/utils/query'
import type { TestContext } from 'tests/utils/types'

export function testDisambiguatingRelationship({ db, schema }: TestContext) {
	const taxReceiver = { id: createId() }
	const merchant = { id: createId() }
	const customer = { id: createId() }
	const taxTransfer = {
		id: createId(),
		toId: taxReceiver.id,
		fromId: customer.id,
	}
	const paymentTransfer = {
		id: createId(),
		toId: merchant.id,
		fromId: customer.id,
	}
	const sale = {
		id: createId(),
		paymentId: paymentTransfer.id,
		taxId: taxTransfer.id,
	}

	describe('Disambiguating relationship', () => {
		beforeAll(async () => {
			await db.insert(schema.disambiguatingUsers).values(taxReceiver)
			await db.insert(schema.disambiguatingUsers).values(merchant)
			await db.insert(schema.disambiguatingUsers).values(customer)
			await db.insert(schema.disambiguatingTransfers).values(taxTransfer)
			await db.insert(schema.disambiguatingTransfers).values(paymentTransfer)
			await db.insert(schema.disambiguatingSales).values(sale)
		})

		afterAll(async () => {
			await db
				.delete(schema.disambiguatingSales)
				.where(inArray(schema.disambiguatingSales.id, [sale.id]))
			await db
				.delete(schema.disambiguatingTransfers)
				.where(
					inArray(schema.disambiguatingTransfers.id, [
						taxTransfer.id,
						paymentTransfer.id,
					])
				)
			await db
				.delete(schema.disambiguatingUsers)
				.where(
					inArray(schema.disambiguatingUsers.id, [
						taxReceiver.id,
						merchant.id,
						customer.id,
					])
				)
		})

		test('one.many (holds reference)', async () => {
			async function fetchUser(userId: string) {
				return db.query.disambiguatingUsers
					.findFirst({
						where: (users, { eq }) => eq(users.id, userId),
						with: {
							receivedTransfers: {
								orderBy: (transfers, { asc }) => asc(transfers.createdAt),
								columns: { fromId: true, id: true, toId: true },
							},
							sentTransfers: {
								orderBy: (transfers, { asc }) => asc(transfers.createdAt),
								columns: { fromId: true, id: true, toId: true },
							},
						},
					})
					.then(throwIfnull)
			}

			const [customerResult, merchantResult, taxReceiverResult] =
				await Promise.all([
					fetchUser(customer.id),
					fetchUser(merchant.id),
					fetchUser(taxReceiver.id),
				])

			expect(customerResult).toStrictEqual({
				...customer,
				sentTransfers: [taxTransfer, paymentTransfer],
				receivedTransfers: [],
			})
			expect(merchantResult).toStrictEqual({
				...merchant,
				sentTransfers: [],
				receivedTransfers: [paymentTransfer],
			})
			expect(taxReceiverResult).toStrictEqual({
				...taxReceiver,
				sentTransfers: [],
				receivedTransfers: [taxTransfer],
			})
		})

		test('many.one (being referenced)', async () => {
			async function fetchTransfer(transferId: string) {
				return db.query.disambiguatingTransfers
					.findFirst({
						where: (transfers, { eq }) => eq(transfers.id, transferId),
						columns: { fromId: true, id: true, toId: true },
						with: {
							from: true,
							to: true,
						},
					})
					.then(throwIfnull)
			}

			const [paymentTransferResult, taxTransferResult] = await Promise.all([
				fetchTransfer(paymentTransfer.id),
				fetchTransfer(taxTransfer.id),
			])

			expect(paymentTransferResult).toStrictEqual({
				...paymentTransfer,
				from: customer,
				to: merchant,
			})

			expect(taxTransferResult).toStrictEqual({
				...taxTransfer,
				from: customer,
				to: taxReceiver,
			})
		})

		test('one.one', async () => {
			async function fetchTransfer(transferId: string) {
				return db.query.disambiguatingTransfers
					.findFirst({
						where: (transfers, { eq }) => eq(transfers.id, transferId),
						columns: { fromId: true, id: true, toId: true },
						with: {
							salePayment: true,
							saleTax: true,
						},
					})
					.then(throwIfnull)
			}

			const [paymentTransferResult, taxTransferResult, saleResult] =
				await Promise.all([
					fetchTransfer(paymentTransfer.id),
					fetchTransfer(taxTransfer.id),
					db.query.disambiguatingSales
						.findFirst({
							where: (sales, { eq }) => eq(sales.id, sale.id),
							with: {
								payment: {
									columns: { id: true, fromId: true, toId: true },
								},
								tax: {
									columns: { id: true, fromId: true, toId: true },
								},
							},
						})
						.then(throwIfnull),
				])

			expect(paymentTransferResult).toStrictEqual({
				...paymentTransfer,
				salePayment: sale,
				saleTax: null,
			})

			expect(taxTransferResult).toStrictEqual({
				...taxTransfer,
				salePayment: null,
				saleTax: sale,
			})

			expect(saleResult).toStrictEqual({
				...sale,
				payment: paymentTransfer,
				tax: taxTransfer,
			})
		})
	})
}
