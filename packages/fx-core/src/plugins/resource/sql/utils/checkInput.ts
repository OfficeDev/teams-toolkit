import { Message } from "./message";
export function sqlUserNameValidator(name: string): string | undefined {
  name = name?.trim();

  if (!name) {
    return Message.inputCheck.sqlUserNameEmpty;
  }

  if (invalidSqlUserName.names.includes(name)) {
    return Message.inputCheck.sqlUserNameContainsSqlIdentifier;
  }

  if (name.search(/[^a-zA-Z0-9]+/) >= 0) {
    return Message.inputCheck.sqlUserNameContainsNonAlphanumeric;
  }

  if (name.match(/^[0-9]/)) {
    return Message.inputCheck.sqlUserNameStartWithNumber;
  }
  return undefined;
}

class invalidSqlUserName {
  static names = [
    "admin",
    "administrator",
    "sa",
    "root",
    "dbmanager",
    "loginmanager",
    "dbo",
    "guest",
    "public",
    "db_accessadmin",
    "db_backupoperator",
    "db_datareader",
    "db_datawriter",
    "db_ddladmin",
    "db_denydatareader",
    "db_denydatawriter",
    "db_owner",
    "db_securityadmin",
    "INFORMATION_SCHEMA",
    "sys",
  ];
}

/**
 * Your password must be at least 8 characters in length.
 * Your password must be no more than 128 characters in length.
 * Your password must contain characters from three of the following categories – English uppercase letters, English lowercase letters, numbers (0-9), and non-alphanumeric characters (!, $, #, %, etc.).
 * Your password cannot contain all or part of the login name. Part of a login name is defined as three or more consecutive alphanumeric characters.
 */
export function sqlPasswordValidatorGenerator(
  name: string
): (password: string) => string | undefined {
  return (password: string): string | undefined => {
    password = password?.trim();
    if (!password) {
      return Message.inputCheck.sqlPasswordEmpty;
    }

    if (password.length < 8) {
      return Message.inputCheck.sqlPasswordLengthLessThan8;
    }

    if (password.length > 128) {
      return Message.inputCheck.sqlPasswordLengthGreatThan128;
    }

    const containLowerLetters = password.match(/[a-z]+/) ? 1 : 0;
    const containUpperLetters = password.match(/[A-Z]+/) ? 1 : 0;
    const containNumbers = password.match(/[0-9]+/) ? 1 : 0;
    const containSpecialCharacters = password.match(/[\[\]{}/~`_"$&+,:;=?@#|'<>.^*()%!-]+/) ? 1 : 0;

    if (containLowerLetters + containUpperLetters + containNumbers + containSpecialCharacters < 3) {
      return Message.inputCheck.sqlPasswordMustContain3Categories;
    }

    if (password.toLowerCase().search(name.toLowerCase()) >= 0) {
      return Message.inputCheck.sqlPasswordCannotContainUserName;
    }

    return undefined;
  };
}

export function sqlConfirmPasswordValidatorGenerator(
  password: string
): (confirm: string) => string | undefined {
  return (confirm: string): string | undefined => {
    if (password !== confirm) {
      return Message.inputCheck.sqlPasswordMustMatch;
    }
    return undefined;
  };
}
