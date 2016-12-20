Broker History API
==================

This API allows to retrieve the history of sensor measurements.

Install
-------

Build the image:

```
$ docker build -t waziup/sth-comet .
$ docker run -t --net=host waziup/sth-comet

```
Or simply run

```
$ docker-compose up

```
under the .yml file here : https://github.com/Waziup/Platform/blob/master/broker/docker-compose.yml

Testing
----

https://github.com/Waziup/Platform/blob/master/broker/history/history_test.md
