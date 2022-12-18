FROM dragas/thttpd:latest

RUN apk update
RUN apk add git
RUN mkdir -p /app/repo
ARG GIT_BRANCH=master
RUN git clone https://github.com/willwoodlief/four-colors.git  /app/repo
RUN mv /app/repo/src/* /var/www/http
WORKDIR /var/www/http

EXPOSE 80

ENTRYPOINT ["/usr/sbin/thttpd", "-D", "-l", "/dev/stderr"]
CMD ["-d", "/var/www/http"]