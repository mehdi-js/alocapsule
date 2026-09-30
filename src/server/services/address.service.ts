import { toPersianDigits } from "@/lib/utils";
import {
  type AddressInput,
  MAX_ADDRESSES_PER_USER,
} from "@/lib/validation/address";
import { UserFacingError } from "@/server/errors";
import {
  countUserAddresses,
  createAddressRecord,
  deleteAddressRecord,
  findUserAddress,
  listUserAddresses,
  setDefaultAddressRecord,
  updateAddressRecord,
} from "@/server/repositories/address.repository";

export interface AddressDto {
  id: string;
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  postalCode: string | null;
  line: string;
  isDefault: boolean;
}

const NOT_FOUND_MESSAGE = "این آدرس پیدا نشد. صفحه را دوباره بارگذاری کنید.";

export function listAddresses(userId: string): Promise<AddressDto[]> {
  return listUserAddresses(userId);
}

function writeData(input: AddressInput) {
  return {
    receiverName: input.receiverName,
    receiverPhone: input.receiverPhone,
    province: input.province,
    city: input.city,
    postalCode: input.postalCode,
    line: input.line,
  };
}

/** اولین آدرس کاربر همیشه پیش‌فرض می‌شود */
export async function createAddress(
  userId: string,
  input: AddressInput,
): Promise<AddressDto> {
  const count = await countUserAddresses(userId);
  if (count >= MAX_ADDRESSES_PER_USER) {
    throw new UserFacingError(
      `حداکثر ${toPersianDigits(MAX_ADDRESSES_PER_USER)} آدرس می‌توانید ذخیره کنید؛ ابتدا یکی را حذف کنید.`,
    );
  }
  return createAddressRecord(
    userId,
    writeData(input),
    input.isDefault || count === 0,
  );
}

/**
 * ویرایش آدرس. برداشتن تیک «پیش‌فرض» از آدرس پیش‌فرض اثری ندارد؛ پیش‌فرض
 * فقط با انتخاب آدرس دیگر عوض می‌شود تا کاربر همیشه یک آدرس پیش‌فرض داشته باشد.
 */
export async function updateAddress(
  userId: string,
  id: string,
  input: AddressInput,
): Promise<void> {
  const current = await findUserAddress(id, userId);
  if (!current) throw new UserFacingError(NOT_FOUND_MESSAGE);
  await updateAddressRecord(
    id,
    userId,
    writeData(input),
    input.isDefault || current.isDefault,
  );
}

export async function makeDefaultAddress(
  userId: string,
  id: string,
): Promise<void> {
  if (!(await setDefaultAddressRecord(id, userId))) {
    throw new UserFacingError(NOT_FOUND_MESSAGE);
  }
}

export async function removeAddress(userId: string, id: string): Promise<void> {
  if (!(await deleteAddressRecord(id, userId))) {
    throw new UserFacingError(NOT_FOUND_MESSAGE);
  }
}
