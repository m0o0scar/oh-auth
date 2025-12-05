export default function Home() {
  const providers = [
    {
      id: 'google',
      name: 'Google',
      description: 'Start the Google OAuth2 flow using configured credentials.',
      docs: 'https://developers.google.com/identity/protocols/oauth2',
    },
    {
      id: 'raindrop',
      name: 'Raindrop',
      description: 'Connect to Raindrop to capture and manage bookmarks.',
      docs: 'https://developer.raindrop.io/',
    },
  ];

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="text-center md:text-left">
          <p className="badge badge-primary mb-3">TailwindCSS + DaisyUI</p>
          <h1 className="text-3xl font-bold">OAuth2 playground</h1>
          <p className="text-base-content/70">
            Start authentication flows for supported providers. Buttons redirect
            to live auth routes that will send you to each provider.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {providers.map((provider) => (
            <div key={provider.id} className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title">{provider.name}</h2>
                <p>{provider.description}</p>
                <div className="card-actions items-center justify-between">
                  <a className="btn btn-primary" href={`/auth/${provider.id}`}>
                    Start auth
                  </a>
                  <a
                    className="link link-secondary"
                    href={provider.docs}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Docs
                  </a>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="alert alert-info shadow">
          <div>
            <h3 className="font-semibold">Next steps</h3>
            <p className="text-sm text-base-content/80">
              Set environment variables for Google and Raindrop, then run the
              auth flow to observe redirected logins and callback token logging.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
