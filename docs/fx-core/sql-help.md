## DatabaseUserCreateError

### Error Message

database <database> create user <user> failed. 

### Mitigation

#### Step #1 add skip flag
1. Open `.fx\env.default.json` file
1. Set value of 'skipAddingUser' config of 'fx-resource-azure-sql' 

   ![image](https://user-images.githubusercontent.com/16380704/114984949-d0469f80-9ec4-11eb-84e9-e8afc91a1f2d.png)

1. Run `Provision` command again

#### Step #2 add database user manually

To make sure the identity user can access to database correctly, you should add database user manually.
Since the current logged in account hasn't enough permission to add database user, you may get a user account have enough permission to access to database. 
1. Find values of 'sqlEndpoint', 'databaseName' config of 'fx-resource-azure-sql' and value of 'identity' config of 'fx-resource-identity'

   ![image](https://user-images.githubusercontent.com/16380704/114985422-6084e480-9ec5-11eb-96e0-7393de28d9b4.png)

1. Provision aad admin in SQL Database. You can follow [set aad admin](https://docs.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-configure?tabs=azure-powershell#provision-azure-ad-admin-sql-database) to set aad admin with enough permission for the {sqlEndpoint}.

1. Login the SQL server from portal and select database to login

  ![image](https://user-images.githubusercontent.com/16380704/114985949-fae52800-9ec5-11eb-9f07-b5f8abb02361.png)

4. Create contained database users. Execute Transact-SQL `CREATE USER [{identity}] FROM EXTERNAL PROVIDER;`

  ![image](https://user-images.githubusercontent.com/16380704/114986232-57484780-9ec6-11eb-8757-5be3e45d1ac0.png)

