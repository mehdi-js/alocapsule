"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  type AddressFormInput,
  addressInputSchema,
} from "@/lib/validation/address";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  type AddressDto,
  createAddress,
  listAddresses,
  makeDefaultAddress,
  removeAddress,
  updateAddress,
} from "@/server/services/address.service";

import {
  type ActionResult,
  INVALID_INPUT_MESSAGE,
  runAction,
  validationFailure,
} from "./types";

/** ترتیب: کاربر واردشده ← Zod ← service ← فهرست تازه‌ی آدرس‌ها */

const LOGIN_REQUIRED_MESSAGE = "ابتدا وارد حساب خود شوید.";

type AddressesResult = ActionResult<{
  addresses: AddressDto[];
  /** شناسه‌ی آدرس تازه‌ساخته (برای انتخاب خودکار در صفحه‌ی تسویه) */
  addressId?: string;
}>;

const idSchema = z.string().min(1).max(64);

async function withAddresses(
  userId: string,
  extra: { addressId?: string } = {},
) {
  revalidatePath("/checkout");
  revalidatePath("/account/addresses");
  return { addresses: await listAddresses(userId), ...extra };
}

export async function createAddressAction(
  input: AddressFormInput,
): Promise<AddressesResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: LOGIN_REQUIRED_MESSAGE };
  const parsed = addressInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    const address = await createAddress(user.id, parsed.data);
    return withAddresses(user.id, { addressId: address.id });
  });
}

export async function updateAddressAction(
  id: string,
  input: AddressFormInput,
): Promise<AddressesResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: LOGIN_REQUIRED_MESSAGE };
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, message: INVALID_INPUT_MESSAGE };
  const parsed = addressInputSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  return runAction(async () => {
    await updateAddress(user.id, parsedId.data, parsed.data);
    return withAddresses(user.id, { addressId: parsedId.data });
  });
}

export async function setDefaultAddressAction(
  id: string,
): Promise<AddressesResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: LOGIN_REQUIRED_MESSAGE };
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await makeDefaultAddress(user.id, parsedId.data);
    return withAddresses(user.id);
  });
}

export async function deleteAddressAction(
  id: string,
): Promise<AddressesResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: LOGIN_REQUIRED_MESSAGE };
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, message: INVALID_INPUT_MESSAGE };

  return runAction(async () => {
    await removeAddress(user.id, parsedId.data);
    return withAddresses(user.id);
  });
}
