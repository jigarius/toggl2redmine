FROM redmine:4.2

ENV LANG=en_us

RUN apt update -qq > /dev/null \
  && apt install -qqy build-essential make vim less > /dev/null

CMD ["rails", "server", "-b", "0.0.0.0"]
