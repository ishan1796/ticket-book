#!/bin/bash
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/16/main/postgresql.conf
echo "host all all 0.0.0.0/0 trust" >> /etc/postgresql/16/main/pg_hba.conf
echo "host all all ::/0 trust" >> /etc/postgresql/16/main/pg_hba.conf
echo "bind 0.0.0.0" >> /etc/redis/redis.conf
echo "protected-mode no" >> /etc/redis/redis.conf
/etc/init.d/postgresql restart
/etc/init.d/redis-server restart
