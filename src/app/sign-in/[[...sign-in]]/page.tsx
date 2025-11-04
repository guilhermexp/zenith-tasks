import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
  const clerkEnabled = publishableKey.trim().startsWith('pk_');

  if (!clerkEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
        <div className="glass-card max-w-md w-full px-6 py-8 text-center space-y-4">
          <h1 className="text-xl font-semibold text-neutral-100">Autenticação desabilitada</h1>
          <p className="text-sm text-neutral-400">
            O fluxo de login via Clerk está desativado neste ambiente. Para habilitar, configure
            as variáveis <code className="font-mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> e
            <code className="font-mono">CLERK_SECRET_KEY</code> com credenciais válidas.
          </p>
          <p className="text-xs text-neutral-500">
            Enquanto o bypass de autenticação estiver ativo, use o aplicativo normalmente sem efetuar login.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
            card: 'bg-neutral-900 border border-neutral-800',
            headerTitle: 'text-white',
            headerSubtitle: 'text-neutral-400',
            formFieldLabel: 'text-neutral-300',
            formFieldInput: 'bg-neutral-800 border-neutral-700 text-white',
            footerActionLink: 'text-blue-500 hover:text-blue-400',
            identityPreviewText: 'text-neutral-300',
            identityPreviewEditButtonIcon: 'text-neutral-400',
            formResendCodeLink: 'text-blue-500 hover:text-blue-400',
            dividerLine: 'bg-neutral-800',
            dividerText: 'text-neutral-500',
            socialButtonsBlockButton: 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700',
            socialButtonsBlockButtonText: 'text-neutral-300',
            alertText: 'text-neutral-300',
            formHeaderTitle: 'text-white',
            formHeaderSubtitle: 'text-neutral-400',
            verificationLinkStatusIconBox__verified: 'text-green-500',
            verificationLinkStatusText__verified: 'text-green-500',
            otpCodeFieldInput: 'bg-neutral-800 border-neutral-700 text-white',
            formFieldSuccessText: 'text-green-500',
            formFieldErrorText: 'text-red-500',
            formFieldHintText: 'text-neutral-500',
            logoBox: 'justify-center',
            footer: 'hidden'
          },
          variables: {
            colorPrimary: '#3b82f6',
            colorBackground: '#171717',
            colorInputBackground: '#262626',
            colorInputText: '#ffffff',
          }
        }}
        showDevModeWarnings={false}
        redirectUrl="/"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
