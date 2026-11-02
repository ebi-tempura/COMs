from sqlalchemy import select
from models import BuildingAccount


def lock_account_numbering(database, account_id):
    database.execute(
        select(BuildingAccount.database_id)
        .where(BuildingAccount.account_id == account_id)
        .with_for_update()
    ).scalar_one()