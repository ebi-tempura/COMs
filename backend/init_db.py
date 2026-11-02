from sqlalchemy import inspect, text

from database import Base, engine
import models
import models_.notifications


def create_tables():
    if engine.dialect.name != "postgresql":
        raise RuntimeError("This setup requires PostgreSQL.")

    tables = Base.metadata.sorted_tables

    with engine.begin() as connection:
        connection.execute(text("SET LOCAL search_path TO public"))

        existing = inspect(connection).get_table_names(schema="public")

        if existing:
            raise RuntimeError(
                "Public tables already exist. Stop and review: "
                + ", ".join(existing)
            )

        # Create every registered model, including notifications.
        Base.metadata.create_all(bind=connection)

        quote = connection.dialect.identifier_preparer.quote

        for table in tables:
            table_name = f"public.{quote(table.name)}"

            # Browser clients must access COMs data through FastAPI.
            connection.execute(
                text(
                    f"ALTER TABLE {table_name} "
                    "ENABLE ROW LEVEL SECURITY"
                )
            )

            connection.execute(
                text(
                    f"REVOKE ALL PRIVILEGES ON TABLE {table_name} "
                    "FROM PUBLIC, anon, authenticated"
                )
            )

        created = set(
            inspect(connection).get_table_names(schema="public")
        )
        expected = {table.name for table in tables}

        if created != expected:
            raise RuntimeError("Table verification failed.")

    # Printed only after the transaction commits successfully.
    print(f"Successfully created {len(tables)} COMs tables.")

    for table in tables:
        print(f"- {table.name}")


if __name__ == "__main__":
    create_tables()