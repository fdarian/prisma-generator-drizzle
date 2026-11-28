/**
 * SQL names of the built-in operator classes, from `impl AsRef<str> for SQLOperatorClassKind`
 * in prisma-engines (sql-schema-describer). DMMF holds the Prisma name (`JsonbPathOps`)
 * for a built-in class and the verbatim string for `raw("...")`.
 */
const SQL_OPERATOR_CLASSES: Record<string, string> = {
	InetOps: 'inet_ops',
	JsonbOps: 'jsonb_ops',
	JsonbPathOps: 'jsonb_path_ops',
	ArrayOps: 'array_ops',
	TextOps: 'text_ops',
	BitMinMaxOps: 'bit_minmax_ops',
	VarBitMinMaxOps: 'varbit_minmax_ops',
	BpcharBloomOps: 'bpchar_bloom_ops',
	BpcharMinMaxOps: 'bpchar_minmax_ops',
	ByteaBloomOps: 'bytea_bloom_ops',
	ByteaMinMaxOps: 'bytea_minmax_ops',
	DateBloomOps: 'date_bloom_ops',
	DateMinMaxOps: 'date_minmax_ops',
	DateMinMaxMultiOps: 'date_minmax_multi_ops',
	Float4BloomOps: 'float4_bloom_ops',
	Float4MinMaxOps: 'float4_minmax_ops',
	Float4MinMaxMultiOps: 'float4_minmax_multi_ops',
	Float8BloomOps: 'float8_bloom_ops',
	Float8MinMaxOps: 'float8_minmax_ops',
	Float8MinMaxMultiOps: 'float8_minmax_multi_ops',
	InetInclusionOps: 'inet_inclusion_ops',
	InetBloomOps: 'inet_bloom_ops',
	InetMinMaxOps: 'inet_minmax_ops',
	InetMinMaxMultiOps: 'inet_minmax_multi_ops',
	Int2BloomOps: 'int2_bloom_ops',
	Int2MinMaxOps: 'int2_minmax_ops',
	Int2MinMaxMultiOps: 'int2_minmax_multi_ops',
	Int4BloomOps: 'int4_bloom_ops',
	Int4MinMaxOps: 'int4_minmax_ops',
	Int4MinMaxMultiOps: 'int4_minmax_multi_ops',
	Int8BloomOps: 'int8_bloom_ops',
	Int8MinMaxOps: 'int8_minmax_ops',
	Int8MinMaxMultiOps: 'int8_minmax_multi_ops',
	NumericBloomOps: 'numeric_bloom_ops',
	NumericMinMaxOps: 'numeric_minmax_ops',
	NumericMinMaxMultiOps: 'numeric_minmax_multi_ops',
	OidBloomOps: 'oid_bloom_ops',
	OidMinMaxOps: 'oid_minmax_ops',
	OidMinMaxMultiOps: 'oid_minmax_multi_ops',
	TextBloomOps: 'text_bloom_ops',
	TextMinMaxOps: 'text_minmax_ops',
	TimestampBloomOps: 'timestamp_bloom_ops',
	TimestampMinMaxOps: 'timestamp_minmax_ops',
	TimestampMinMaxMultiOps: 'timestamp_minmax_multi_ops',
	TimestampTzBloomOps: 'timestamptz_bloom_ops',
	TimestampTzMinMaxOps: 'timestamptz_minmax_ops',
	TimestampTzMinMaxMultiOps: 'timestamptz_minmax_multi_ops',
	TimeBloomOps: 'time_bloom_ops',
	TimeMinMaxOps: 'time_minmax_ops',
	TimeMinMaxMultiOps: 'time_minmax_multi_ops',
	TimeTzBloomOps: 'timetz_bloom_ops',
	TimeTzMinMaxOps: 'timetz_minmax_ops',
	TimeTzMinMaxMultiOps: 'timetz_minmax_multi_ops',
	UuidBloomOps: 'uuid_bloom_ops',
	UuidMinMaxOps: 'uuid_minmax_ops',
	UuidMinMaxMultiOps: 'uuid_minmax_multi_ops',
}

export function getSqlOperatorClass(operatorClass: string) {
	return Object.hasOwn(SQL_OPERATOR_CLASSES, operatorClass)
		? SQL_OPERATOR_CLASSES[operatorClass]
		: operatorClass
}
