# polytags — build the bunli CLI and install the standalone binary.

# Where the standalone binary goes on `make install`.
# the 2026-11 doctrine: NOTHING here installs outside the stow package —
# placement belongs to the dots stow adapter
# (dots/polytags/.local/share/depends/polytags/Makefile: build ->
# dots/polytags/.local/bin/polytags -> stow). A manual copy to
# $PREFIX/bin double-claims the link the package owns.

DIST := dist/index

# Build targets:
#   make build        -> glibc standalone (runs on THIS host + typical Linux)
#   make build-static -> musl artifact (portable to musl distros; NOT runnable
#                        on glibc-only systems like this WSL Ubuntu host —
#                        bun's musl compile still links libc.musl + libstdc++)
build:
	bun x bunli build --targets linux-x64 --minify
	mv -f $(DIST) dist/polytags
	rm -f dist/index.map

build-static:
	bun x bunli build --targets linux-x64-musl --minify
	mv -f $(DIST) dist/polytags-musl
	rm -f dist/index.map

# Pure renderer spec — always safe to run.
test:
	bun test tests/render.test.ts

clean:
	rm -rf dist .bunli

.PHONY: build build-static test clean
