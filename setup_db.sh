#!/bin/bash
/etc/init.d/postgresql start
/etc/init.d/redis-server start
su - postgres -c "psql -c \"DROP DATABASE IF EXISTS ticket_booking;\""
su - postgres -c "psql -c \"CREATE DATABASE ticket_booking;\""
su - postgres -c "psql -d ticket_booking -c \"SELECT 1;\""
